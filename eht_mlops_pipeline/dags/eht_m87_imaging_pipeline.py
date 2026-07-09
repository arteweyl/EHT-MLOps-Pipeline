"""
EHT M87 Imaging MLOps Pipeline DAG.

Didactic replication of the Event Horizon Telescope Collaboration (2019) M87* imaging,
structured following the best practices of Python Norte 2026 presentation:
- TaskFlow API (@dag and @task decorators)
- Typings and from __future__ import annotations
- Idempotent logical date-based partitioning to prevent run collision
- BranchPythonOperator for the Quality Gate promotion
"""

from __future__ import annotations

import os
import sys
import pickle
import json
from pathlib import Path
from typing import Dict, Any
from datetime import datetime, timezone

# Airflow standard and providers imports
try:
    from airflow.sdk import dag, task, get_current_context
    from airflow.providers.standard.operators.python import BranchPythonOperator
except ImportError:
    from airflow.decorators import dag, task
    from airflow.operators.python import BranchPythonOperator, get_current_context

# Add the parent directory to python path to load the src library
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.simulator import EHTSimulator
from src.calibrator import EHTCalibrator
from src.reconstruction import EHTReconstructor
from src.evaluator import EHTEvaluator
from src.mlops_registry import EHTModelRegistry

try:
    import pendulum
    START_DATE = pendulum.datetime(2026, 7, 1, tz="UTC")
except Exception:
    START_DATE = datetime(2026, 7, 1)

# Base directories for idempotent artifacts partitioning
BASE_DIR = Path("/tmp/eht_m87_mlops_pipeline")

def current_run_date() -> str:
    """
    Retrieves the logical/execution date from the Airflow task context.
    If run outside Airflow, falls back to the current UTC date.
    Ensures idempotency in pipeline retries and backfills.
    """
    try:
        context = get_current_context()
        if context.get("ds"):
            return str(context["ds"])
        for key in ("logical_date", "data_interval_start", "run_after"):
            value = context.get(key)
            if value:
                if hasattr(value, "to_date_string"):
                    return value.to_date_string()
                return value.date().isoformat()
    except Exception:
        pass
    return datetime.now(timezone.utc).date().isoformat()


@dag(
    dag_id="eht_m87_imaging_pipeline",
    start_date=START_DATE,
    schedule="@monthly",
    catchup=False,
    tags=["eht", "mlops", "blackhole", "physics"],
    default_args={"retries": 1},
)
def eht_m87_imaging_pipeline():
    
    @task(task_id="ingest_vlbi_data")
    def ingest_vlbi_data() -> str:
        """
        Task 1: Simulates baseline coordinates (u,v coverage) and synthetic visibilities.
        Ref: [2] Array and Instrumentation (VLBI concept).
        Idempotent: writes to a folder partitioned by logical run date.
        """
        run_date = current_run_date()
        run_dir = BASE_DIR / f"run_date={run_date}"
        run_dir.mkdir(parents=True, exist_ok=True)
        ingest_filepath = run_dir / "ingested_data.pkl"
        
        sim = EHTSimulator(target_dec_deg=12.391) # M87* Declination
        
        # 1. Generate u-v coverage for 8 hours of Earth's rotation
        baselines_uv, baseline_names = sim.generate_uv_coverage(hours=8, num_points=100)
        
        # 2. Generate ground-truth black hole image (asymmetric crescent representing M87*)
        gt_image, _, _ = sim.generate_black_hole_model(
            grid_size=64, 
            fov_uas=120, 
            ring_rad_uas=20.0, 
            ring_width_uas=4.0, 
            asymmetry=0.5, 
            phi_0_deg=135
        )
        
        # 3. Compute true visibilities (Fourier Transform sampled at u-v locations)
        true_visibilities = sim.sample_visibilities(gt_image, fov_uas=120, baselines_uv=zip(baselines_uv, baseline_names))
        
        with open(ingest_filepath, 'wb') as f:
            pickle.dump({
                'gt_image': gt_image,
                'true_visibilities': true_visibilities,
                'fov_uas': 120,
                'grid_size': 64
            }, f)
            
        print(f"Data ingestion complete. Saved to {ingest_filepath}.")
        return str(ingest_filepath)

    @task(task_id="validate_data_schema")
    def validate_data_schema(ingest_filepath: str) -> str:
        """
        Task 1b: Validates that the ingested VLBI data conforms to the expected schema
        (e.g., correct stations, dimensions, and no NaNs).
        Ref: presentation's validate_schema task.
        """
        import numpy as np
        with open(ingest_filepath, 'rb') as f:
            data = pickle.load(f)
            
        true_vis = data['true_visibilities']
        fov_uas = data['fov_uas']
        grid_size = data['grid_size']
        
        # Validation checks
        if fov_uas != 120:
            raise ValueError(f"Campo de visão incorreto. Esperado: 120, obtido: {fov_uas}")
            
        if grid_size != 64:
            raise ValueError(f"Tamanho do grid incorreto. Esperado: 64, obtido: {grid_size}")
            
        expected_baselines = {'ALMA-LMT', 'ALMA-SMT', 'ALMA-SMA', 'ALMA-IRAM', 'ALMA-SPT', 
                              'LMT-SMT', 'LMT-SMA', 'LMT-IRAM', 'LMT-SPT', 
                              'SMT-SMA', 'SMT-IRAM', 'SMT-SPT', 
                              'SMA-IRAM', 'SMA-SPT', 
                              'IRAM-SPT'}
                              
        actual_baselines = set(true_vis.keys())
        missing = expected_baselines - actual_baselines
        if missing:
            raise ValueError(f"Baselines obrigatórias ausentes nos dados VLBI: {sorted(missing)}")
            
        for name, baseline in true_vis.items():
            if np.isnan(baseline['vis']).any():
                raise ValueError(f"Valores nulos (NaN) detectados na baseline {name}")
                
            if len(baseline['vis']) != 100:
                raise ValueError(f"Duração da baseline {name} incorreta. Esperado: 100 pontos, obtido: {len(baseline['vis'])}")
                
        print("VLBI Data schema validation completed successfully.")
        return ingest_filepath

    @task(task_id="calibrate_data")
    def calibrate_data(ingest_filepath: str) -> str:
        """
        Task 2: Simulates atmospheric phase errors, amplitude drift, thermal noise,
        and performs self-calibration (Fringe Fitting / Phase adjustment).
        Ref: [3] Data Processing and Calibration.
        """
        with open(ingest_filepath, 'rb') as f:
            data = pickle.load(f)
            
        true_vis = data['true_visibilities']
        gt_image = data['gt_image']
        fov_uas = data['fov_uas']
        
        calibrator = EHTCalibrator(random_seed=42)
        
        # 1. Corrupt data with station phase errors and baseline thermal noise
        corrupted_vis = calibrator.corrupt_visibilities(true_vis, thermal_noise_level=0.03, station_phase_noise_std=1.2)
        
        # 2. Compute closure phases
        closure_phases = calibrator.compute_closure_phases(corrupted_vis)
        
        # 3. Perform self-calibration (phasor circular mean coordinate descent)
        calibrated_vis = calibrator.self_calibrate(corrupted_vis, model_image=gt_image, fov_uas=fov_uas)
        
        cal_filepath = Path(ingest_filepath).parent / "calibrated_data.pkl"
        with open(cal_filepath, 'wb') as f:
            pickle.dump({
                'corrupted_vis': corrupted_vis,
                'closure_phases': closure_phases,
                'calibrated_vis': calibrated_vis,
                'fov_uas': fov_uas
            }, f)
            
        print(f"Calibration complete. Saved to {cal_filepath}.")
        return str(cal_filepath)

    @task(task_id="reconstruct_image")
    def reconstruct_image(cal_filepath: str) -> str:
        """
        Task 3: Reconstructs the 2D image from calibrated visibilities using
        Regularized Maximum Likelihood (RML) with analytical gradients.
        Ref: [4] Imaging the Central Supermassive Black Hole, [7] CHIRP Algorithm.
        """
        with open(cal_filepath, 'rb') as f:
            data = pickle.load(f)
            
        calibrated_vis = data['calibrated_vis']
        fov_uas = data['fov_uas']
        
        recon = EHTReconstructor(grid_size=64, fov_uas=fov_uas)
        
        # Hyperparameters for reconstruction (could be tuned via AutoML / grid search)
        alpha_tv = 0.05
        alpha_entropy = 0.005
        
        # Run optimization
        reconstructed_image, final_loss = recon.reconstruct(
            calibrated_data=calibrated_vis,
            alpha_tv=alpha_tv,
            alpha_entropy=alpha_entropy,
            max_iter=60
        )
        
        recon_filepath = Path(cal_filepath).parent / "reconstructed_image.pkl"
        with open(recon_filepath, 'wb') as f:
            pickle.dump({
                'reconstructed_image': reconstructed_image,
                'alpha_tv': alpha_tv,
                'alpha_entropy': alpha_entropy,
                'loss': final_loss
            }, f)
            
        print(f"Reconstruction complete. Saved to {recon_filepath}. Final loss: {final_loss:.6f}")
        return str(recon_filepath)

    @task(task_id="evaluate_reconstruction")
    def evaluate_reconstruction(recon_filepath: str, ingest_filepath: str) -> Dict[str, Any]:
        """
        Task 4: Compares reconstructed image with GRMHD simulations to match parameters
        and computes image fidelity metrics (MSE, cross-correlation).
        Ref: [5] Physical Origin, [6] Mass & Shadow estimation.
        """
        with open(ingest_filepath, 'rb') as f:
            ingest_data = pickle.load(f)
        gt_image = ingest_data['gt_image']
        fov_uas = ingest_data['fov_uas']
        
        with open(recon_filepath, 'rb') as f:
            recon_data = pickle.load(f)
        reconstructed = recon_data['reconstructed_image']
        
        evaluator = EHTEvaluator(grid_size=64, fov_uas=fov_uas)
        
        # 1. Compute fidelity metrics against ground truth
        metrics = evaluator.calculate_metrics(reconstructed, gt_image)
        
        # 2. Fit to the GRMHD simulation library
        grmhd_lib = evaluator.generate_grmhd_library()
        fit_result = evaluator.fit_grmhd_model(reconstructed, grmhd_lib)
        
        eval_data = {
            'metrics': metrics,
            'fit_result': {
                'estimated_mass_10_9': float(fit_result['estimated_mass_10_9']),
                'estimated_spin': float(fit_result['estimated_spin']),
                'fit_correlation': float(fit_result['fit_correlation']),
            },
            'reconstructed_image_path': recon_filepath
        }
        
        report_filepath = Path(recon_filepath).parent / "evaluation_report.pkl"
        with open(report_filepath, 'wb') as f:
            pickle.dump(eval_data, f)
            
        # Write a JSON metrics report for MLOps tracking
        metrics_json_path = Path(recon_filepath).parent / "metrics.json"
        metrics_json_path.write_text(json.dumps(eval_data, indent=2), encoding="utf-8")
        
        print("Evaluation complete.")
        return eval_data

    def choose_next_step(**context) -> str:
        """
        BranchPythonOperator deciding the next step based on the evaluation metrics.
        Implements the MLOps Quality Gate:
        - Image Fidelity NCC >= 0.70
        - GRMHD correlation >= 0.75
        - Estimated Mass fits in physical range [5.0, 8.0]
        """
        ti = context["ti"]
        eval_data = ti.xcom_pull(task_ids="evaluate_reconstruction")
        
        fid = eval_data["metrics"]["fidelity_score"]
        fit_corr = eval_data["fit_result"]["fit_correlation"]
        mass = eval_data["fit_result"]["estimated_mass_10_9"]
        
        is_valid = (fid >= 0.70 and fit_corr >= 0.75 and 5.0 <= mass <= 8.0)
        if is_valid:
            return "register_model"
        return "reject_model"

    @task(task_id="register_model")
    def register_model(eval_data: Dict[str, Any]) -> str:
        """
        Model Registry task for approved models.
        Registers the model as PRODUCTION champion.
        """
        recon_filepath = eval_data['reconstructed_image_path']
        with open(recon_filepath, 'rb') as f:
            recon_data = pickle.load(f)
        reconstructed = recon_data['reconstructed_image']
        alpha_tv = recon_data['alpha_tv']
        alpha_entropy = recon_data['alpha_entropy']
        
        registry = EHTModelRegistry()
        run_record = registry.log_run(
            parameters={
                'alpha_tv': alpha_tv,
                'alpha_entropy': alpha_entropy,
                'observation_date': current_run_date(),
                'calibration_method': 'Phase-Self-Cal'
            },
            metrics=eval_data['metrics'],
            reconstructed_image=reconstructed,
            fit_result=eval_data['fit_result']
        )
        
        # Save production web record
        web_data_path = Path(recon_filepath).parent.parent / 'last_run_web.json'
        web_data = {
            'run_id': run_record['run_id'],
            'timestamp': run_record['timestamp'],
            'status': 'PRODUCTION',
            'metrics': eval_data['metrics'],
            'fit_result': eval_data['fit_result'],
            'promotion_log': run_record['promotion_log']
        }
        with open(web_data_path, 'w') as f:
            json.dump(web_data, f, indent=4)
            
        return run_record['run_id']

    @task(task_id="reject_model")
    def reject_model(eval_data: Dict[str, Any]) -> str:
        """
        Model Rejection task for runs that failed the quality gate.
        Logs a rejection report and sets Staging/Archive tags.
        """
        recon_filepath = eval_data['reconstructed_image_path']
        
        rejection_report = {
            'status': 'FAILED_VALIDATION',
            'reason': 'Failed MLOps quality gates (reconstruction fidelity or physical mass boundaries).',
            'metrics': eval_data['metrics'],
            'fit_result': eval_data['fit_result']
        }
        
        report_path = Path(recon_filepath).parent / "rejection_report.json"
        report_path.write_text(json.dumps(rejection_report, indent=2), encoding="utf-8")
        
        # Save failed web record
        web_data_path = Path(recon_filepath).parent.parent / 'last_run_web.json'
        web_data = {
            'run_id': f"failed_run_{int(datetime.now(timezone.utc).timestamp())}",
            'timestamp': datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S'),
            'status': 'FAILED_VALIDATION',
            'metrics': eval_data['metrics'],
            'fit_result': eval_data['fit_result'],
            'promotion_log': rejection_report['reason']
        }
        with open(web_data_path, 'w') as f:
            json.dump(web_data, f, indent=4)
            
        return str(report_path)

    # Pipeline task definitions
    ingest_path = ingest_vlbi_data()
    validated_path = validate_data_schema(ingest_path)
    cal_path = calibrate_data(validated_path)
    recon_path = reconstruct_image(cal_path)
    eval_data = evaluate_reconstruction(recon_path, ingest_path)
    
    # Branching Operator
    quality_gate = BranchPythonOperator(
        task_id="quality_gate",
        python_callable=choose_next_step,
    )
    
    approved = register_model(eval_data)
    rejected = reject_model(eval_data)
    
    # Dependencies
    eval_data >> quality_gate
    quality_gate >> [approved, rejected]

# Instantiate DAG
eht_m87_imaging_pipeline()
