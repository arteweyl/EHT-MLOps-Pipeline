// State Management
let activeTarget = 'starfield';
let activeNight = 1;
let activeEra = 'messier';
let noiseLevel = 2; // 1: Low, 2: Medium, 3: High
let blackHoleMass = 5; // Default mass in solar units (affects Einstein Radius)
const blackHolePos = { x: 300, y: 300 }; // Centered on canvas
let isDragging = false;
let animationFrameId = null;
let accretionDiskRotation = 0;

// Canvas Setup
const canvas = document.getElementById('telescope-canvas');
const ctx = canvas.getContext('2d');

// DOM Elements
const modeBadge = document.getElementById('mode-badge');
const coordDisplay = document.getElementById('coord-display');
const analysisTitle = document.getElementById('analysis-title');
const classificationResult = document.getElementById('classification-result');
const massSliderContainer = document.getElementById('mass-slider-container');
const massSlider = document.getElementById('mass-slider');
const massVal = document.getElementById('mass-val');
const noiseSlider = document.getElementById('noise-slider');
const noiseVal = document.getElementById('noise-val');

// Stars Generation
const stars = [];
const m71Stars = [];

function initStars() {
    // Generate 180 background stars for the sky
    stars.length = 0;
    for (let i = 0; i < 180; i++) {
        // Distribute stars mostly randomly but with a few clusters
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 1.8 + 0.5,
            brightness: Math.random() * 0.5 + 0.5,
            color: getRandomStarColor()
        });
    }

    // Generate 350 stars for Messier 71 (Globular Cluster)
    // Clustered in the center using a gaussian-like distribution
    m71Stars.length = 0;
    for (let i = 0; i < 350; i++) {
        const angle = Math.random() * Math.PI * 2;
        // Box-Muller transform for normal distribution
        const u1 = Math.random() || 0.0001;
        const u2 = Math.random() || 0.0001;
        const radius = Math.sqrt(-2.0 * Math.log(u1)) * 45; // spread radius

        m71Stars.push({
            offsetX: Math.cos(angle) * radius,
            offsetY: Math.sin(angle) * radius,
            size: Math.random() * 1.5 + 0.3,
            color: getRandomStarColor(true), // More colorful stars for M71
            brightness: Math.random() * 0.7 + 0.3
        });
    }
}

function getRandomStarColor(isCluster = false) {
    const colors = [
        '#ffffff', // White
        '#f8fafc', // Pure white
        '#bae6fd', // Soft blue
        '#fed7aa', // Soft orange
        '#fef08a'  // Soft yellow
    ];

    if (isCluster) {
        // Clusters have older red/yellow giants and younger blue stars
        const clusterColors = [
            '#fdba74', '#f59e0b', // Red/Orange giants
            '#93c5fd', '#3b82f6', // Blue stars
            '#ffffff', '#f8fafc'
        ];
        return clusterColors[Math.floor(Math.random() * clusterColors.length)];
    }

    return colors[Math.floor(Math.random() * colors.length)];
}

// Target Coordinates mappings (Historical/Scientifically inspired)
const targetCoords = {
    starfield: "RA: 19h 53m 46s | DEC: +18° 46′ 45″",
    comet: "RA: 19h 50m 12s | DEC: +19° 02′ 10″",
    m71: "RA: 19h 53m 46s | DEC: +18° 46′ 45″",
    blackhole: "RA: 19h 55m 30s | DEC: +18° 25′ 12″"
};

const targetTitles = {
    starfield: "Analisando: Campo Vazio",
    comet: "Analisando: Objeto Suspeito A",
    m71: "Analisando: Objeto Suspeito B",
    blackhole: "Analisando: Objeto Suspeito C"
};

// Relativistic Lensing Formula
// Warps coordinates around the black hole center
function getLensedPosition(starX, starY, bhX, bhY, einsteinRadius) {
    const dx = starX - bhX;
    const dy = starY - bhY;
    const d = Math.sqrt(dx * dx + dy * dy);

    const photonSphere = einsteinRadius * 0.5;

    if (d < photonSphere) {
        return null; // Light swallowed by the Event Horizon / Photon Sphere
    }

    // Einstein lensing distortion factor: d_lensed = d + R_E^2 / d
    const dLensed = d + (einsteinRadius * einsteinRadius) / d;

    return {
        x: bhX + (dx / d) * dLensed,
        y: bhY + (dy / d) * dLensed,
        distance: d,
        lensedDistance: dLensed
    };
}

// Drawing Functions
function drawStarfield(einsteinRadius = 0) {
    stars.forEach(star => {
        let drawX = star.x;
        let drawY = star.y;
        let scale = 1;
        let stretchAngle = 0;
        let stretchAmount = 0;

        // If lensing is active (Modern Era + Black Hole)
        if (einsteinRadius > 0 && activeTarget === 'blackhole') {
            const lensed = getLensedPosition(star.x, star.y, blackHolePos.x, blackHolePos.y, einsteinRadius);

            if (!lensed) return; // Swallowed star

            drawX = lensed.x;
            drawY = lensed.y;

            // Calculate magnification and stretching (Einstein arcs)
            const u = lensed.distance / einsteinRadius;
            // Magnification formula: mu = (u^2 + 2) / (u * sqrt(u^2 + 4))
            const magnification = (u * u + 2) / (u * Math.sqrt(u * u + 4));
            scale = Math.min(magnification, 3.5); // cap magnification to avoid giant blobs

            // Stretches star tangentially to the black hole
            if (lensed.distance < einsteinRadius * 2) {
                stretchAmount = (einsteinRadius / lensed.distance) * 2;
                stretchAngle = Math.atan2(lensed.y - blackHolePos.y, lensed.x - blackHolePos.x) + Math.PI / 2;
            }
        }

        ctx.save();
        ctx.fillStyle = star.color;
        ctx.globalAlpha = star.brightness;

        if (stretchAmount > 1.2 && activeEra === 'modern') {
            // Draw stretched Einstein Arc
            ctx.translate(drawX, drawY);
            ctx.rotate(stretchAngle);
            ctx.beginPath();
            ctx.ellipse(0, 0, star.size * scale * 0.6, star.size * scale * (1 + stretchAmount * 0.4), 0, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Draw normal circular star
            ctx.beginPath();
            ctx.arc(drawX, drawY, star.size * scale, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    });
}

function drawComet() {
    // Comet position changes depending on night (Messier's method verification)
    let cometX = 220;
    let cometY = 240;

    if (activeNight === 2) {
        cometX = 300;
        cometY = 290;
    } else if (activeNight === 3) {
        cometX = 380;
        cometY = 340;
    }

    if (activeEra === 'messier') {
        // Fuzzy monochrome comet smudge
        ctx.save();
        const grad = ctx.createRadialGradient(cometX, cometY, 2, cometX, cometY, 28);
        grad.addColorStop(0, 'rgba(230, 230, 230, 0.9)');
        grad.addColorStop(0.2, 'rgba(200, 200, 200, 0.6)');
        grad.addColorStop(0.5, 'rgba(150, 150, 150, 0.2)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cometX, cometY, 30, 0, Math.PI * 2);
        ctx.fill();

        // Faint tail pointing away from "sun" (towards bottom-right)
        const tailGrad = ctx.createLinearGradient(cometX, cometY, cometX + 45, cometY + 45);
        tailGrad.addColorStop(0, 'rgba(180, 180, 180, 0.3)');
        tailGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = tailGrad;
        ctx.beginPath();
        ctx.moveTo(cometX - 8, cometY + 8);
        ctx.lineTo(cometX + 60, cometY + 60);
        ctx.lineTo(cometX + 8, cometY - 8);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    } else {
        // Modern era high-definition comet
        ctx.save();
        // Glow
        const glowGrad = ctx.createRadialGradient(cometX, cometY, 0, cometX, cometY, 35);
        glowGrad.addColorStop(0, 'rgba(147, 197, 253, 0.8)');
        glowGrad.addColorStop(0.3, 'rgba(59, 130, 246, 0.4)');
        glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(cometX, cometY, 40, 0, Math.PI * 2);
        ctx.fill();

        // Dust tail (whitish-yellow)
        const dustTail = ctx.createRadialGradient(cometX, cometY, 5, cometX + 90, cometY + 70, 60);
        dustTail.addColorStop(0, 'rgba(254, 240, 138, 0.5)');
        dustTail.addColorStop(0.5, 'rgba(253, 186, 116, 0.2)');
        dustTail.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = dustTail;
        ctx.beginPath();
        ctx.moveTo(cometX - 10, cometY + 5);
        ctx.lineTo(cometX + 130, cometY + 110);
        ctx.lineTo(cometX + 5, cometY - 10);
        ctx.closePath();
        ctx.fill();

        // Ion tail (thin, blue, straight)
        const ionTail = ctx.createLinearGradient(cometX, cometY, cometX + 160, cometY + 110);
        ionTail.addColorStop(0, 'rgba(56, 189, 248, 0.7)');
        ionTail.addColorStop(0.5, 'rgba(14, 165, 233, 0.3)');
        ionTail.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.strokeStyle = ionTail;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cometX, cometY);
        ctx.lineTo(cometX + 170, cometY + 120);
        ctx.stroke();

        // Bright active nucleus
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#93c5fd';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(cometX, cometY, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function drawM71() {
    const centerX = 300;
    const centerY = 300;

    if (activeEra === 'messier') {
        // Messier sees a fuzzy, grainy gray smudge.
        // It is perfectly stationary between nights.
        ctx.save();
        const grad = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, 55);
        grad.addColorStop(0, 'rgba(220, 220, 220, 0.85)');
        grad.addColorStop(0.3, 'rgba(180, 180, 180, 0.55)');
        grad.addColorStop(0.6, 'rgba(120, 120, 120, 0.2)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 60, 0, Math.PI * 2);
        ctx.fill();

        // Add a bit of fine grain to simulate stars that can't be resolved
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        for (let i = 0; i < 40; i++) {
            const r = Math.random() * 45;
            const theta = Math.random() * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(centerX + Math.cos(theta) * r, centerY + Math.sin(theta) * r, 0.8, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    } else {
        // Modern Era resolves individual stars in the globular cluster M71!
        ctx.save();
        // Central glow of unresolved stars
        const coreGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 80);
        coreGlow.addColorStop(0, 'rgba(254, 240, 138, 0.18)');
        coreGlow.addColorStop(0.5, 'rgba(147, 197, 253, 0.08)');
        coreGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = coreGlow;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 100, 0, Math.PI * 2);
        ctx.fill();

        // Draw the hundreds of cluster stars
        m71Stars.forEach(star => {
            // Add subtle twinkling
            const twinkle = Math.sin(Date.now() * 0.003 + star.offsetX) * 0.2 + 0.9;
            ctx.fillStyle = star.color;
            ctx.globalAlpha = star.brightness * twinkle;
            ctx.beginPath();
            ctx.arc(centerX + star.offsetX, centerY + star.offsetY, star.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    }
}

function drawBlackHole(einsteinRadius) {
    if (activeEra === 'messier') {
        // Messier sees a fuzzy, grainy gray smudge, EXACTLY like M71.
        // It remains stationary between nights. This shows the ambiguity.
        ctx.save();
        const grad = ctx.createRadialGradient(blackHolePos.x, blackHolePos.y, 5, blackHolePos.x, blackHolePos.y, 50);
        grad.addColorStop(0, 'rgba(215, 215, 215, 0.85)');
        grad.addColorStop(0.3, 'rgba(175, 175, 175, 0.55)');
        grad.addColorStop(0.6, 'rgba(115, 115, 115, 0.18)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(blackHolePos.x, blackHolePos.y, 55, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    } else {
        // Modern Era reveals the stunning general relativity simulation!
        ctx.save();

        const rHorizon = einsteinRadius * 0.42; // Event horizon radius
        const rAccretion = einsteinRadius * 1.5; // Outer accretion disk radius

        // 1. Accretion Disk - Back side (warped above and below the horizon due to light bending)
        // Draw the warped halo
        const haloGrad = ctx.createRadialGradient(
            blackHolePos.x, blackHolePos.y, rHorizon,
            blackHolePos.x, blackHolePos.y, rAccretion
        );
        // Doppler Beaming: Left side is blue-shifted (bright orange/white), right side is red-shifted (dark red/gray)
        // We use rotation to animate the disk
        accretionDiskRotation += 0.015;

        // Warped vertical halo (light from behind bent over/under the event horizon)
        ctx.shadowColor = '#ea580c';
        ctx.shadowBlur = 15;

        // Outer glow
        const outerGlow = ctx.createRadialGradient(
            blackHolePos.x, blackHolePos.y, rHorizon,
            blackHolePos.x, blackHolePos.y, rAccretion * 1.8
        );
        outerGlow.addColorStop(0, 'rgba(249, 115, 22, 0.35)');
        outerGlow.addColorStop(0.3, 'rgba(239, 68, 68, 0.15)');
        outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = outerGlow;
        ctx.beginPath();
        ctx.arc(blackHolePos.x, blackHolePos.y, rAccretion * 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Draw the Einstein Ring (Lensed back accretion disk)
        // Left side is hotter and brighter
        const discGradBack = ctx.createSweepGradient ? ctx.createSweepGradient(blackHolePos.x, blackHolePos.y) : null;
        // Fallback since sweep gradients are not standard canvas: we use radial gradients and overlay shadows
        ctx.strokeStyle = 'rgba(249, 115, 22, 0.85)';
        ctx.lineWidth = rHorizon * 0.75;
        ctx.beginPath();
        ctx.arc(blackHolePos.x, blackHolePos.y, rHorizon * 1.3, 0, Math.PI * 2);
        ctx.stroke();

        // Left-side brightening (Doppler Beaming)
        const dopplerGlow = ctx.createRadialGradient(
            blackHolePos.x - rHorizon, blackHolePos.y, 0,
            blackHolePos.x - rHorizon, blackHolePos.y, rHorizon * 1.5
        );
        dopplerGlow.addColorStop(0, '#ffffff');
        dopplerGlow.addColorStop(0.3, '#fdba74');
        dopplerGlow.addColorStop(0.7, 'rgba(249, 115, 22, 0.4)');
        dopplerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = dopplerGlow;
        ctx.beginPath();
        ctx.arc(blackHolePos.x, blackHolePos.y, rHorizon * 2.1, Math.PI * 0.5, Math.PI * 1.5);
        ctx.fill();

        // Reset shadow
        ctx.shadowBlur = 0;

        // 2. Event Horizon (Perfect black sphere in the center)
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(blackHolePos.x, blackHolePos.y, rHorizon, 0, Math.PI * 2);
        ctx.fill();

        // 3. Accretion Disk - Front side (passes in front of the event horizon, thin horizontal ellipse)
        ctx.save();
        ctx.beginPath();
        // Clip to only draw in front of event horizon (the bottom half of the disk overlaps the front of the black hole)
        ctx.ellipse(
            blackHolePos.x, blackHolePos.y + rHorizon * 0.1,
            rAccretion, rHorizon * 0.28,
            0.05 * Math.sin(accretionDiskRotation), 0, Math.PI * 2
        );

        // Doppler Beaming Gradient: Bright left, dim right
        const discGradFront = ctx.createLinearGradient(
            blackHolePos.x - rAccretion, blackHolePos.y,
            blackHolePos.x + rAccretion, blackHolePos.y
        );
        discGradFront.addColorStop(0, 'rgba(239, 68, 68, 0.05)');  // Far left (dimmer outer edge)
        discGradFront.addColorStop(0.2, '#ffffff');               // Inner left (extremely bright, hot)
        discGradFront.addColorStop(0.35, '#fdba74');             // Mid left (orange-yellow)
        discGradFront.addColorStop(0.5, '#ea580c');              // Center
        discGradFront.addColorStop(0.8, '#7c2d12');              // Mid right (dim red)
        discGradFront.addColorStop(1, 'rgba(124, 45, 18, 0.1)'); // Far right (extremely dim)

        ctx.fillStyle = discGradFront;
        ctx.fill();
        ctx.restore();

        // Draw the inner photon ring (extremely sharp thin ring wrapping the event horizon)
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(blackHolePos.x, blackHolePos.y, rHorizon * 1.05, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }
}

// Master Render Loop
function render() {
    // 1. Clear Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply Filter for Era (Telescope degradation simulation)
    if (activeEra === 'messier') {
        // Blur, contrast, and noise simulates 18th century glass optics
        let blurAmount = 6;
        if (noiseLevel === 1) blurAmount = 4;
        if (noiseLevel === 3) blurAmount = 9;
        ctx.filter = `blur(${blurAmount}px) contrast(1.3) grayscale(100%)`;
    } else {
        // Space telescope filter (crisp, colorful, negligible noise)
        let blurAmount = 0.5;
        if (noiseLevel === 3) blurAmount = 1.2; // simulate atmospheric distortion
        ctx.filter = `blur(${blurAmount}px) saturate(1.2)`;
    }

    // Einstein Radius calculated from Black Hole Mass slider
    // Mass: 1 to 15, translates to Einstein Radius of 15 to 110 pixels
    const einsteinRadius = blackHoleMass * 7.5;

    // 2. Draw active target
    if (activeTarget === 'starfield') {
        drawStarfield(0);
    } else if (activeTarget === 'comet') {
        drawStarfield(0);
        drawComet();
    } else if (activeTarget === 'm71') {
        drawStarfield(0);
        drawM71();
    } else if (activeTarget === 'blackhole') {
        // Draw lensed starfield first
        drawStarfield(einsteinRadius);
        // Draw black hole on top
        drawBlackHole(einsteinRadius);
    }

    // Reset filter for eyepiece HUD / overlay drawing
    ctx.filter = 'none';

    // 3. Draw eyepiece dust and vignette in Messier Mode
    if (activeEra === 'messier') {
        // Draw eyepiece vignette/scratch lines
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        // Simulate minor hairline dust/scratches
        ctx.beginPath();
        ctx.arc(150, 200, 12, 0, Math.PI * 0.4);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(420, 390, 8, 0.3, Math.PI * 0.8);
        ctx.stroke();
        ctx.restore();
    }

    // Continue the animation frame loop
    animationFrameId = requestAnimationFrame(render);
}

// User Action Handlers (Classification game)
let discoveredObjects = {
    comet: false,
    m71: false,
    blackhole: false
};

function setupGame() {
    const btnComet = document.getElementById('btn-classify-comet');
    const btnNebula = document.getElementById('btn-classify-nebula');

    btnComet.addEventListener('click', () => {
        classify(true);
    });

    btnNebula.addEventListener('click', () => {
        classify(false);
    });
}

function classify(isCometGuess) {
    if (activeTarget === 'starfield') {
        classificationResult.className = "classification-result fail";
        classificationResult.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Aqui há apenas estrelas de fundo fixas. Tente selecionar um <strong>Objeto Suspeito</strong>.";
        return;
    }

    if (activeTarget === 'comet') {
        if (isCometGuess) {
            discoveredObjects.comet = true;
            classificationResult.className = "classification-result success";
            classificationResult.innerHTML = `<strong><i class='fa-solid fa-circle-check'></i> Excelente!</strong> Você percebeu que o objeto se moveu no céu ao longo das noites. Charles Messier confirmaria: <strong>é um cometa!</strong> Você acaba de catalogar o cometa C/1781.`;
            updateCatalogUI();
        } else {
            classificationResult.className = "classification-result fail";
            classificationResult.innerHTML = `<strong><i class='fa-solid fa-circle-xmark'></i> Incorreto.</strong> Observe com cuidado: o Objeto A muda de posição em relação às estrelas de fundo. Se ele se move, não pode ser uma nebulosa fixa.`;
        }
    }

    if (activeTarget === 'm71') {
        if (!isCometGuess) {
            discoveredObjects.m71 = true;
            classificationResult.className = "classification-result success";
            classificationResult.innerHTML = `<strong><i class='fa-solid fa-circle-check'></i> Correto!</strong> O objeto B permaneceu imóvel em todas as noites. Charles Messier o catalogou como a nebulosa <strong>M71</strong> para que ninguém a confunda com cometas.`;
            updateCatalogUI();
        } else {
            classificationResult.className = "classification-result fail";
            classificationResult.innerHTML = `<strong><i class='fa-solid fa-circle-xmark'></i> Incorreto.</strong> O Objeto B está perfeitamente fixo nas mesmas coordenadas. Cometas se movem no céu noturno.`;
        }
    }

    if (activeTarget === 'blackhole') {
        if (!isCometGuess) {
            discoveredObjects.blackhole = true;
            classificationResult.className = "classification-result success";
            classificationResult.innerHTML = `<strong><i class='fa-solid fa-circle-check'></i> Sensacional!</strong> O objeto C é fixo e foi catalogado como <strong>M111</strong>. No telescópio de Messier, parecia apenas uma mancha cinza idêntica ao M71. Mas na verdade... <strong>é um Buraco Negro!</strong> Vá para a aba <strong>Ciência Moderna</strong> para desvendar sua estrutura!`;
            updateCatalogUI();
        } else {
            classificationResult.className = "classification-result fail";
            classificationResult.innerHTML = `<strong><i class='fa-solid fa-circle-xmark'></i> Incorreto.</strong> O Objeto C permaneceu estático todas as noites. Ele é uma fonte de luz fixa no céu profundo (neste caso, a luz distorcida ao redor de um buraco negro).`;
        }
    }
}

function updateCatalogUI() {
    // Show catalog items if discovered
    const items = document.querySelectorAll('.catalog-item');
    if (discoveredObjects.m71 && items[0]) {
        items[0].style.border = "1px solid rgba(251, 191, 36, 0.4)";
        items[0].style.background = "rgba(251, 191, 36, 0.05)";
    }
    if (discoveredObjects.blackhole && items[1]) {
        items[1].style.border = "1px solid rgba(56, 189, 248, 0.4)";
        items[1].style.background = "rgba(56, 189, 248, 0.05)";
    }
}

// Interactive Lensing Drag & Drop Event Listeners
function setupInteractiveLensing() {
    canvas.addEventListener('mousedown', (e) => {
        if (activeTarget !== 'blackhole' || activeEra !== 'modern') return;

        const rect = canvas.getBoundingClientRect();
        // Scale mouse coords to canvas internal resolution (600x600)
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);

        const dx = x - blackHolePos.x;
        const dy = y - blackHolePos.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        // Grab radius
        if (dist < (blackHoleMass * 7.5 * 1.5)) {
            isDragging = true;
            canvas.style.cursor = 'grabbing';
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!isDragging || activeTarget !== 'blackhole' || activeEra !== 'modern') {
            // Hover cursor indicator
            if (activeTarget === 'blackhole' && activeEra === 'modern') {
                const rect = canvas.getBoundingClientRect();
                const x = (e.clientX - rect.left) * (canvas.width / rect.width);
                const y = (e.clientY - rect.top) * (canvas.height / rect.height);
                const dx = x - blackHolePos.x;
                const dy = y - blackHolePos.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < (blackHoleMass * 7.5 * 1.5)) {
                    canvas.style.cursor = 'grab';
                } else {
                    canvas.style.cursor = 'crosshair';
                }
            }
            return;
        }

        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);

        // Keep within eyepiece limits
        const dxCenter = x - 300;
        const dyCenter = y - 300;
        const distCenter = Math.sqrt(dxCenter*dxCenter + dyCenter*dyCenter);

        if (distCenter < 240) {
            blackHolePos.x = x;
            blackHolePos.y = y;
        }
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
        if (canvas) canvas.style.cursor = activeTarget === 'blackhole' && activeEra === 'modern' ? 'grab' : 'crosshair';
    });
}

// UI Event Listeners Setup
function setupUI() {
    // Targets Buttons
    const targetBtns = document.querySelectorAll('.target-btn');
    targetBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            targetBtns.forEach(b => b.classList.remove('active'));
            const button = e.currentTarget;
            button.classList.add('active');
            activeTarget = button.dataset.target;

            // Update HUD coordinates and diary titles
            coordDisplay.textContent = targetCoords[activeTarget];
            analysisTitle.textContent = targetTitles[activeTarget];
            classificationResult.className = "classification-result";
            classificationResult.textContent = "Objeto selecionado. Utilize os botões acima para registrar se ele se move ou se é fixo.";

            // Reset black hole position to center on target switch
            blackHolePos.x = 300;
            blackHolePos.y = 300;

            // Enable/Disable mass slider container based on target
            if (activeTarget === 'blackhole' && activeEra === 'modern') {
                massSliderContainer.classList.remove('disabled');
            } else {
                massSliderContainer.classList.add('disabled');
            }
        });
    });

    // Night Buttons
    const nightBtns = document.querySelectorAll('.night-btn');
    nightBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            nightBtns.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            activeNight = parseInt(e.currentTarget.dataset.night);
        });
    });

    // Era Buttons
    const btnMessier = document.getElementById('btn-era-messier');
    const btnModern = document.getElementById('btn-era-modern');

    btnMessier.addEventListener('click', () => {
        btnMessier.classList.add('active');
        btnModern.classList.remove('active');
        activeEra = 'messier';
        modeBadge.textContent = "Modo: Telescópio Histórico (1781)";
        modeBadge.style.color = "var(--accent-gold)";
        massSliderContainer.classList.add('disabled');
    });

    btnModern.addEventListener('click', () => {
        btnModern.classList.add('active');
        btnMessier.classList.remove('active');
        activeEra = 'modern';
        modeBadge.textContent = "Modo: Telescópio Espacial (Moderno)";
        modeBadge.style.color = "var(--accent-sky)";

        if (activeTarget === 'blackhole') {
            massSliderContainer.classList.remove('disabled');
        }
    });

    // Sliders
    massSlider.addEventListener('input', (e) => {
        blackHoleMass = parseFloat(e.target.value);
        // Display solar mass conversion
        massVal.innerHTML = `${(blackHoleMass * 1.5).toFixed(1)}M<sub>☉</sub> (Massas Solares)`;
    });

    noiseSlider.addEventListener('input', (e) => {
        noiseLevel = parseInt(e.target.value);
        const labelMap = { 1: "Baixa", 2: "Média", 3: "Alta" };
        noiseVal.textContent = labelMap[noiseLevel];
    });

    // Tabs Setup
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            e.currentTarget.classList.add('active');
            const tabId = `tab-${e.currentTarget.dataset.tab}`;
            document.getElementById(tabId).classList.add('active');
        });
    });
}

// Init
window.addEventListener('DOMContentLoaded', () => {
    initStars();
    setupUI();
    setupGame();
    setupInteractiveLensing();
    setupAirflowPipeline();
    render();
});

// ==========================================
// EHT MLOPS PIPELINE SIMULATOR (AIRFLOW)
// ==========================================
function setupAirflowPipeline() {
    const btnRunDag = document.getElementById('btn-run-dag');
    const dagStatusBadge = document.getElementById('dag-status-badge');
    const nodes = {
        ingest: document.getElementById('node-ingest'),
        calibrate: document.getElementById('node-calibrate'),
        reconstruct: document.getElementById('node-reconstruct'),
        evaluate: document.getElementById('node-evaluate'),
        register: document.getElementById('node-register')
    };

    const stepTitle = document.getElementById('step-title');
    const stepRef = document.getElementById('step-ref');
    const stepDesc = document.getElementById('step-desc');
    const stepVisualContainer = document.getElementById('step-visual-container');
    const registryTableBody = document.getElementById('registry-table-body');

    let isPipelineRunning = false;
    let pipelineAnimId = null;
    let pipelineDataReal = null;

    // Try to load real data from the last python run if hosted on server
    fetch('eht_mlops_pipeline/last_run_web.json')
        .then(response => response.json())
        .then(data => {
            pipelineDataReal = data;
            console.log("Loaded real pipeline data:", pipelineDataReal);
        })
        .catch(err => {
            console.log("No real pipeline data loaded (expected on file:// protocol). Using high-fidelity EHT defaults.");
        });

    const stepsMetadata = {
        ingest: {
            title: "<i class='fa-solid fa-cloud-arrow-down'></i> Tarefa: ingest_vlbi_data",
            ref: "Ref: EHT Results II. Array and Instrumentation",
            desc: "Simula o array global de radiotelescópios VLBI (ALMA, LMT, SMA, etc.) observando o M87*. À medida que a Terra gira, as distâncias projetadas entre as antenas traçam espirais de frequências espaciais (cobertura u-v). Calcula as visibilidades complexas teóricas.",
            duration: 4000
        },
        calibrate: {
            title: "<i class='fa-solid fa-wand-magic-sparkles'></i> Tarefa: calibrate_data",
            ref: "Ref: EHT Results III. Data Processing and Calibration",
            desc: "Simula a atenuação atmosférica e flutuações de fase instrumental adicionando ruídos severos. Em seguida, implementa o algoritmo de calibração por Fase de Fechamento (Closure Phase) e a autocalibração circular de fase, corrigindo as distorções.",
            duration: 4000
        },
        reconstruct: {
            title: "<i class='fa-solid fa-rotate'></i> Tarefa: reconstruct_image",
            ref: "Ref: EHT Results IV. Imaging & Bouman's RML [7]",
            desc: "Resolve o problema inverso de Fourier utilizando Regularização de Máxima Verossimilhança (RML) com gradiente analítico. Aplica regularizadores de Variação Total (TV) para suavizar ruídos e Entropia para restringir a difusão da imagem.",
            duration: 5000
        },
        evaluate: {
            title: "<i class='fa-solid fa-chart-line'></i> Tarefa: evaluate_reconstruction",
            ref: "Ref: EHT Results V & VI. Physical Origin & Mass shadow",
            desc: "Compara a imagem de rádio reconstruída com uma biblioteca de simulações magnetohidrodinâmicas relativísticas (GRMHD) variando a massa do buraco negro M e o spin a. Encontra o modelo físico de melhor ajuste por correlação cruzada.",
            duration: 4500
        },
        register: {
            title: "<i class='fa-solid fa-box-archive'></i> Tarefa: register_model_and_deploy",
            ref: "Ref: MLOps Model Registry / Quality Gates",
            desc: "Executa os gates de validação física: verifica se a fidelidade de imagem (NCC) > 0.70 e a massa estimada está nos limites físicos (5.5 a 7.5 bilhões de M☉). Se aprovado, promove o modelo para o status PRODUCTION e registra na base.",
            duration: 4000
        }
    };

    // Node click handler to view steps info
    Object.keys(nodes).forEach(key => {
        nodes[key].addEventListener('click', () => {
            if (isPipelineRunning) return;
            showStepDetail(key);
        });
    });

    btnRunDag.addEventListener('click', () => {
        if (isPipelineRunning) return;
        runPipeline();
    });

    function showStepDetail(key) {
        // Set active node class
        Object.keys(nodes).forEach(k => nodes[k].classList.remove('active-detail'));
        nodes[key].classList.add('active-detail');

        const meta = stepsMetadata[key];
        stepTitle.innerHTML = meta.title;
        stepRef.textContent = meta.ref;
        stepDesc.textContent = meta.desc;

        // Setup Canvas
        stepVisualContainer.innerHTML = '';
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 180;
        canvas.className = 'mlops-canvas-small';
        stepVisualContainer.appendChild(canvas);
        const ctx = canvas.getContext('2d');

        // Start drawing step static or animated view
        cancelAnimationFrame(pipelineAnimId);
        let startTime = null;

        function renderStep(timestamp) {
            if (!startTime) startTime = timestamp;
            const progress = Math.min(1.0, (timestamp - startTime) / meta.duration);

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (key === 'ingest') {
                drawIngestStep(canvas, ctx, progress);
            } else if (key === 'calibrate') {
                drawCalibrateStep(canvas, ctx, progress);
            } else if (key === 'reconstruct') {
                drawReconstructStep(canvas, ctx, progress);
            } else if (key === 'evaluate') {
                drawEvaluateStep(canvas, ctx, progress);
            } else if (key === 'register') {
                drawRegisterStep(canvas, ctx, progress);
            }

            if (progress < 1.0 && isPipelineRunning) {
                pipelineAnimId = requestAnimationFrame(renderStep);
            } else {
                // Keep drawing static at progress=1.0
                if (key === 'ingest') drawIngestStep(canvas, ctx, 1.0);
                else if (key === 'calibrate') drawCalibrateStep(canvas, ctx, 1.0);
                else if (key === 'reconstruct') drawReconstructStep(canvas, ctx, 1.0);
                else if (key === 'evaluate') drawEvaluateStep(canvas, ctx, 1.0);
                else if (key === 'register') drawRegisterStep(canvas, ctx, 1.0);
            }
        }

        pipelineAnimId = requestAnimationFrame(renderStep);
    }

    function runPipeline() {
        isPipelineRunning = true;
        btnRunDag.disabled = true;
        btnRunDag.style.opacity = '0.5';
        btnRunDag.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Executando...";

        dagStatusBadge.textContent = "EXECUTANDO";
        dagStatusBadge.className = "status-badge status-running";

        // Reset all nodes
        Object.keys(nodes).forEach(k => {
            nodes[k].className = 'dag-node';
        });

        const stepKeys = ['ingest', 'calibrate', 'reconstruct', 'evaluate', 'register'];
        let currentStepIndex = 0;

        function nextStep() {
            if (currentStepIndex >= stepKeys.length) {
                // Completed pipeline!
                endPipeline(true);
                return;
            }

            const key = stepKeys[currentStepIndex];
            nodes[key].classList.add('node-running');
            showStepDetail(key);

            setTimeout(() => {
                nodes[key].classList.remove('node-running');
                nodes[key].classList.add('node-success');
                currentStepIndex++;
                nextStep();
            }, stepsMetadata[key].duration);
        }

        nextStep();
    }

    function endPipeline(success) {
        isPipelineRunning = false;
        btnRunDag.disabled = false;
        btnRunDag.style.opacity = '1.0';
        btnRunDag.innerHTML = "<i class='fa-solid fa-play'></i> Disparar DAG Run";

        if (success) {
            dagStatusBadge.textContent = "SUCESSO";
            dagStatusBadge.className = "status-badge status-success";

            // Log run in registry table
            addRunToRegistry();
        } else {
            dagStatusBadge.textContent = "FALHOU";
            dagStatusBadge.className = "status-badge status-failed";
        }
    }

    function addRunToRegistry() {
        const emptyRow = document.getElementById('empty-registry-row');
        if (emptyRow) emptyRow.remove();

        // Generate values
        const timestamp = Math.floor(Date.now() / 1000) % 10000000;
        let runId = `run_${timestamp}`;
        let fidelity = "96.58%";
        let mass = "6.5e9";
        let spin = "0.50";
        let gate = "<span class='badge' style='background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.4); padding: 0.15rem 0.4rem; font-size:0.7rem;'>APROVADO</span>";
        let deploy = "<span class='badge' style='background: rgba(56,189,248,0.15); color: var(--accent-sky); border: 1px solid rgba(56,189,248,0.4); padding: 0.15rem 0.4rem; font-size:0.7rem;'>PRODUCTION</span>";

        if (pipelineDataReal) {
            runId = pipelineDataReal.run_id;
            fidelity = `${(pipelineDataReal.metrics.fidelity_score * 100).toFixed(2)}%`;
            mass = `${pipelineDataReal.fit_result.estimated_mass_10_9.toFixed(1)}e9`;
            spin = pipelineDataReal.fit_result.estimated_spin.toFixed(2);

            if (pipelineDataReal.status === 'PRODUCTION') {
                gate = "<span class='badge' style='background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.4); padding: 0.15rem 0.4rem; font-size:0.7rem;'>APROVADO</span>";
                deploy = "<span class='badge' style='background: rgba(56,189,248,0.15); color: var(--accent-sky); border: 1px solid rgba(56,189,248,0.4); padding: 0.15rem 0.4rem; font-size:0.7rem;'>PRODUCTION</span>";
            } else {
                gate = `<span class='badge' style='background: rgba(239,68,68,0.15); color: var(--accent-red); border: 1px solid rgba(239,68,68,0.4); padding: 0.15rem 0.4rem; font-size:0.7rem;'>REJEITADO</span>`;
                deploy = `<span class='badge' style='background: rgba(148,163,184,0.15); color: var(--text-muted); border: 1px solid rgba(148,163,184,0.3); padding: 0.15rem 0.4rem; font-size:0.7rem;'>${pipelineDataReal.status}</span>`;
            }
        }

        // Append row
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${runId}</td>
            <td style="color: #10b981; font-weight: bold;">${fidelity}</td>
            <td>${mass} M☉</td>
            <td>${spin}</td>
            <td>${gate}</td>
            <td>${deploy}</td>
        `;

        registryTableBody.insertBefore(row, registryTableBody.firstChild);
    }

    // ==========================================
    // STEP DRAWING FUNCTIONS (CANVAS RENDERERS)
    // ==========================================

    function drawIngestStep(canvas, ctx, progress) {
        // Draw coordinate grid
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.1)';
        ctx.lineWidth = 1;
        const gridSpacing = 20;
        for (let x = 0; x < canvas.width; x += gridSpacing) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += gridSpacing) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        }

        ctx.save();
        ctx.translate(canvas.width / 4, canvas.height / 2);

        // Draw Ground Truth Crescent (M87* actual)
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#fbbf24';
        ctx.fillStyle = '#1e1b4b'; // Event horizon dark center
        ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI*2); ctx.fill();

        // Relativistic ring (Doppler asymmetric)
        const ringGrad = ctx.createRadialGradient(0, 0, 14, 0, 0, 24);
        ringGrad.addColorStop(0, 'rgba(239, 68, 68, 0)');
        ringGrad.addColorStop(0.3, '#ef4444');
        ringGrad.addColorStop(0.7, '#fbbf24');
        ringGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
        ctx.strokeStyle = ringGrad;
        ctx.lineWidth = 8;

        // Dynamic crescent angle
        ctx.beginPath();
        ctx.arc(0, 0, 19, 0, Math.PI*2);
        ctx.stroke();

        // Overlay a shadow block to make it look crescent-like
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(7, 9, 19, 0.5)';
        ctx.beginPath(); ctx.arc(6, -6, 16, 0, Math.PI*2); ctx.fill();

        ctx.restore();

        // Label left
        ctx.font = '10px Outfit';
        ctx.fillStyle = 'var(--text-muted)';
        ctx.textAlign = 'center';
        ctx.fillText("Modelo Físico (M87*)", canvas.width / 4, canvas.height - 15);

        // Divider line
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.beginPath(); ctx.moveTo(canvas.width / 2, 20); ctx.lineTo(canvas.width / 2, canvas.height - 20); ctx.stroke();

        // Draw right side: U-V Tracks (baselines coverage)
        ctx.save();
        ctx.translate(canvas.width * 3/4, canvas.height / 2);
        ctx.strokeStyle = 'var(--accent-sky)';
        ctx.lineWidth = 1.2;

        // Draw Earth-rotation u-v track ellipses growing
        const baselines = [
            { rx: 50, ry: 20, ang: 0.2 },
            { rx: 38, ry: 28, ang: -0.4 },
            { rx: 42, ry: 15, ang: 0.9 },
            { rx: 25, ry: 12, ang: -0.1 }
        ];

        baselines.forEach((b, i) => {
            ctx.save();
            ctx.rotate(b.ang);
            ctx.beginPath();
            // Draw only a portion based on progress to show them scanning
            ctx.ellipse(0, 0, b.rx, b.ry, 0, 0, progress * Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        });

        // Center crosshair
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
        ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(-60, 0); ctx.lineTo(60, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -60); ctx.lineTo(0, 60); ctx.stroke();

        ctx.restore();

        ctx.fillText("Cobertura U-V (Mega-lambdas)", canvas.width * 3/4, canvas.height - 15);
    }

    function drawCalibrateStep(canvas, ctx, progress) {
        // Draw chart axes
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(40, 20); ctx.lineTo(40, canvas.height - 35); ctx.lineTo(canvas.width - 20, canvas.height - 35); ctx.stroke();

        // Axis labels
        ctx.font = '8px JetBrains Mono';
        ctx.fillStyle = 'var(--text-muted)';
        ctx.fillText("Fluxo (Jy)", 10, 15);
        ctx.fillText("Distância da Baseline (Mλ)", canvas.width / 2 - 40, canvas.height - 10);

        // Draw theoretical visibility curve (smooth Bessel function lookalike)
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let x = 40; x < canvas.width - 20; x++) {
            const freq = (x - 40) / 30;
            // Bessel J0 function approximation: cos(r)/sqrt(r)
            const amp = Math.cos(freq * 3) * Math.exp(-freq * 0.4) * 40 + 80;
            if (x === 40) ctx.moveTo(x, canvas.height - 35 - amp);
            else ctx.lineTo(x, canvas.height - 35 - amp);
        }
        ctx.stroke();

        // Generate static random point coordinates once
        // For animation, points will move towards the curve
        const numPoints = 12;
        const seedPoints = [];
        for (let i = 0; i < numPoints; i++) {
            const x = 50 + (i / numPoints) * (canvas.width - 90);
            const freq = (x - 40) / 30;
            const targetY = canvas.height - 35 - (Math.cos(freq * 3) * Math.exp(-freq * 0.4) * 40 + 80);
            // High error initial offset
            const angle = (i * 1.7) % (Math.PI * 2);
            const errDist = 30 - 20 * (i % 2); // 10-30 px error
            const errX = Math.cos(angle) * errDist;
            const errY = Math.sin(angle) * errDist;
            seedPoints.push({ x, targetY, errX, errY });
        }

        // Draw points: corrupted (red) migrating to calibrated (gold)
        seedPoints.forEach((p, i) => {
            // As progress -> 1, current error -> 0
            const currentErrX = p.errX * (1 - progress);
            const currentErrY = p.errY * (1 - progress);

            const px = p.x + currentErrX;
            const py = p.targetY + currentErrY;

            // Color transitions from red (corrupted) to gold (calibrated)
            const r = Math.floor(239 - (239 - 251) * progress);
            const g = Math.floor(68 + (191 - 68) * progress);
            const b = Math.floor(68 - 32 * progress);
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;

            // Draw scatter dot
            ctx.beginPath();
            ctx.arc(px, py, 3.5, 0, Math.PI * 2);
            ctx.fill();

            // Small connection tail to show path
            if (progress > 0 && progress < 1.0) {
                ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.25)`;
                ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(p.x, p.targetY); ctx.lineTo(px, py); ctx.stroke();
            }
        });

        // Legend
        ctx.font = '9px Outfit';
        ctx.fillStyle = '#ef4444';
        ctx.fillText("● Ruidoso (Atmosfera)", canvas.width - 130, 20);
        ctx.fillStyle = '#fbbf24';
        ctx.fillText("● Calibrado (EHT Phase-Cal)", canvas.width - 130, 32);
    }

    function drawReconstructStep(canvas, ctx, progress) {
        // Left side: model image rebuilding
        ctx.save();
        ctx.translate(canvas.width / 4, canvas.height / 2);

        // Background black
        ctx.fillStyle = '#000000';
        ctx.fillRect(-45, -45, 90, 90);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-45, -45, 90, 90);

        // Render image morphing from blurry Gaussian to ring
        ctx.save();

        // Blur decreases with progress
        const blurValue = Math.max(0.1, 15 * (1 - progress));
        ctx.filter = `blur(${blurValue}px)`;

        if (progress < 0.3) {
            // Stage 1: broad Gaussian prior
            const radGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 22);
            radGrad.addColorStop(0, 'rgba(248, 250, 252, 0.8)');
            radGrad.addColorStop(1, 'rgba(248, 250, 252, 0)');
            ctx.fillStyle = radGrad;
            ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI*2); ctx.fill();
        } else {
            // Stage 2: morphing to ring
            // Ring thickness narrows
            const innerR = 8 + 6 * progress;
            const outerR = 25 - 5 * progress;
            const radGrad = ctx.createRadialGradient(0, 0, innerR, 0, 0, outerR);
            radGrad.addColorStop(0, 'rgba(239, 68, 68, 0)');
            radGrad.addColorStop(0.3, '#ef4444');
            // Doppler beaming peak becomes stronger on bottom left
            radGrad.addColorStop(0.75, '#fbbf24');
            radGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
            ctx.strokeStyle = radGrad;
            ctx.lineWidth = 6 - progress * 2;
            ctx.beginPath(); ctx.arc(0, 0, (innerR + outerR)/2, 0, Math.PI*2); ctx.stroke();

            // Mask to crescent
            ctx.filter = 'none'; // reset filter for mask
            ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
            ctx.beginPath(); ctx.arc(4, -4, 18, 0, Math.PI*2); ctx.fill();
        }

        ctx.restore();
        ctx.restore();

        ctx.font = '10px Outfit';
        ctx.fillStyle = 'var(--text-muted)';
        ctx.textAlign = 'center';
        ctx.fillText("Iteração RML", canvas.width / 4, canvas.height - 15);

        // Right side: Optimization Loss Curve
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.beginPath(); ctx.moveTo(canvas.width / 2, 20); ctx.lineTo(canvas.width / 2, canvas.height - 20); ctx.stroke();

        ctx.save();
        ctx.translate(canvas.width / 2 + 10, 0);

        // Axes
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(25, 25); ctx.lineTo(25, canvas.height - 40); ctx.lineTo(canvas.width/2 - 20, canvas.height - 40); ctx.stroke();

        ctx.font = '8px JetBrains Mono';
        ctx.fillStyle = 'var(--text-muted)';
        ctx.fillText("Loss", 5, 20);
        ctx.fillText("Iter", canvas.width/4 - 10, canvas.height - 25);

        // Loss curve drawing based on progress
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const totalX = canvas.width/2 - 50;
        const currentX = totalX * progress;

        for (let dx = 0; dx <= currentX; dx++) {
            const p = dx / totalX;
            // Exponential decay loss curve
            const lossY = 80 * Math.exp(-p * 6) + 12;
            const px = 25 + dx;
            const py = canvas.height - 40 - lossY;
            if (dx === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // Print Loss value
        const curLoss = 300 * Math.exp(-progress * 6) + 8.17;
        ctx.font = '9px JetBrains Mono';
        ctx.fillStyle = 'var(--text-main)';
        ctx.fillText(`Função Perda (Loss):`, 35, 35);
        ctx.fillStyle = 'var(--accent-sky)';
        ctx.fillText(`${curLoss.toFixed(4)}`, 35, 48);
        ctx.restore();
    }

    function drawEvaluateStep(canvas, ctx, progress) {
        // Grid search of templates
        ctx.font = '10px Outfit';
        ctx.fillStyle = 'var(--text-muted)';
        ctx.fillText("Comparando Simulações GRMHD", 15, 22);

        // We will display 3 template cards side-by-side with different Mass values (different circle diameters)
        const templates = [
            { mass: "5.5e9", spin: "-0.94", radius: 11, active: false },
            { mass: "6.5e9", spin: "+0.50", radius: 18, active: false },
            { mass: "7.5e9", spin: "+0.94", radius: 24, active: false }
        ];

        // At different stages of progress, highlight different models. At the end, highlight the middle (M=6.5, spin=0.5)
        let activeIdx = 0;
        if (progress > 0.8) activeIdx = 1;
        else if (progress > 0.4) activeIdx = 2;
        else activeIdx = 0;

        templates[activeIdx].active = true;

        const cardW = 75;
        const cardH = 95;
        const startX = 25;

        templates.forEach((t, i) => {
            const x = startX + i * 90;
            const y = 35;

            // Card background
            ctx.fillStyle = t.active ? 'rgba(251, 191, 36, 0.08)' : 'rgba(15, 23, 42, 0.4)';
            ctx.strokeStyle = t.active ? '#fbbf24' : 'rgba(56, 189, 248, 0.15)';
            ctx.lineWidth = t.active ? 1.5 : 1;

            ctx.beginPath();
            ctx.roundRect(x, y, cardW, cardH, 6);
            ctx.fill();
            ctx.stroke();

            // Draw Template Ring inside card
            ctx.save();
            ctx.translate(x + cardW/2, y + cardH/2 - 10);

            // Relativistic crescent
            const ringGrad = ctx.createRadialGradient(0, 0, t.radius - 4, 0, 0, t.radius + 4);
            ringGrad.addColorStop(0, 'rgba(239, 68, 68, 0)');
            ringGrad.addColorStop(0.3, '#ef4444');
            ringGrad.addColorStop(0.7, '#fbbf24');
            ringGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
            ctx.strokeStyle = ringGrad;
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(0, 0, t.radius, 0, Math.PI*2); ctx.stroke();

            // Mask
            ctx.fillStyle = 'rgba(10, 15, 30, 0.5)';
            ctx.beginPath(); ctx.arc(3, -3, t.radius - 1, 0, Math.PI*2); ctx.fill();
            ctx.restore();

            // Label parameters
            ctx.font = '8px JetBrains Mono';
            ctx.fillStyle = t.active ? '#fbbf24' : 'var(--text-muted)';
            ctx.textAlign = 'center';
            ctx.fillText(`M: ${t.mass}`, x + cardW/2, y + cardH - 22);
            ctx.fillText(`a: ${t.spin}`, x + cardW/2, y + cardH - 12);

            if (t.active) {
                ctx.font = 'bold 8px Outfit';
                ctx.fillStyle = '#fbbf24';
                // Show fit percentage
                const corr = i === 1 ? (0.75 + 0.225 * progress) : (0.42 + 0.1 * Math.sin(progress * 10));
                ctx.fillText(`Ajuste: ${(corr*100).toFixed(1)}%`, x + cardW/2, y + cardH - 2);
            }
        });

        if (progress === 1.0) {
            ctx.font = 'bold 10px Outfit';
            ctx.fillStyle = '#10b981';
            ctx.textAlign = 'left';
            ctx.fillText("✔ Melhor Ajuste: M87* Massa = 6.5e9 M☉", 15, canvas.height - 20);
        }
    }

    function drawRegisterStep(canvas, ctx, progress) {
        // Draw MLOps gates verification board
        ctx.fillStyle = 'rgba(13, 17, 33, 0.8)';
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(15, 15, canvas.width - 30, canvas.height - 30, 8); ctx.fill(); ctx.stroke();

        ctx.font = 'bold 11px Outfit';
        ctx.fillStyle = 'var(--accent-sky)';
        ctx.fillText("GATES DE QUALIDADE MLOPS (CICLO DE DEPLOY)", 25, 32);

        // Gate list
        const gates = [
            { name: "Verificação de Fidelidade (NCC > 70%)", val: "96.58%", pass: true, delay: 0.1 },
            { name: "Verificação Astrofísica (Massa e Spin plausíveis)", val: "Aprovado", pass: true, delay: 0.4 },
            { name: "Registro de Pesos e Metadados (Model Registry)", val: "Registrado", pass: true, delay: 0.7 }
        ];

        gates.forEach((g, i) => {
            const py = 58 + i * 22;
            const shown = progress >= g.delay;

            if (shown) {
                // Check icon
                ctx.fillStyle = g.pass ? '#10b981' : 'var(--accent-red)';
                ctx.font = '10px Outfit';
                ctx.fillText(g.pass ? "✔" : "✘", 25, py);

                // Name
                ctx.font = '9px Outfit';
                ctx.fillStyle = 'var(--text-main)';
                ctx.fillText(g.name, 42, py);

                // Value
                ctx.font = 'bold 9px JetBrains Mono';
                ctx.textAlign = 'right';
                ctx.fillStyle = g.pass ? '#10b981' : 'var(--accent-red)';
                ctx.fillText(g.val, canvas.width - 30, py);
                ctx.textAlign = 'left';
            } else {
                ctx.fillStyle = 'rgba(148, 163, 184, 0.2)';
                ctx.font = '9px Outfit';
                ctx.fillText("⏳ Pendente...", 42, py);
            }
        });

        // Production deploy badge at the very end
        if (progress >= 0.95) {
            ctx.save();
            ctx.shadowBlur = 8;
            ctx.shadowColor = 'rgba(56, 189, 248, 0.4)';

            const badgeW = 160;
            const badgeX = canvas.width / 2 - badgeW / 2;
            const badgeY = canvas.height - 40;

            ctx.fillStyle = 'rgba(2, 132, 199, 0.15)';
            ctx.strokeStyle = 'var(--accent-sky)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.roundRect(badgeX, badgeY, badgeW, 20, 4); ctx.fill(); ctx.stroke();

            ctx.font = 'bold 9px JetBrains Mono';
            ctx.fillStyle = 'var(--accent-sky)';
            ctx.textAlign = 'center';
            ctx.fillText("DEPLOY STATUS: PRODUCTION", canvas.width / 2, badgeY + 13);
            ctx.restore();
        }
    }
}
