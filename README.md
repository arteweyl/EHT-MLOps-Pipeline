# O Caçador de Nebulosas: O Método de Messier & O Buraco Negro

Este é um projeto interativo de divulgação científica projetado para simular e explicar o **Método de Messier** para identificação de cometas e ilustrar como a tecnologia moderna nos permite diferenciar uma "mancha difusa acinzentada" (como Messier via) de fenômenos extremos do universo, como o aglomerado estelar **Messier 71 (M71)** e um **Buraco Negro Supermassivo**.

## 🌌 Contexto Científico

### O que Charles Messier Fez?
No século XVIII, o astrônomo francês Charles Messier dedicou sua vida a caçar cometas. Naquela época, os telescópios eram rudimentares e objetos do céu profundo (nebulosas, galáxias e aglomerados) apareciam apenas como manchas cinzentas e difusas. Como os cometas também aparecem como manchas cinzentas e difusas antes de desenvolverem caudas, Messier frequentemente perdia tempo observando objetos fixos achando que eram novos cometas.

Para resolver isso, ele criou o **Catálogo Messier** (contendo objetos famosos como M1, M31, M57 e **M71**). O método de Messier consistia em observar o objeto suspeito durante várias noites consecutivas:
* Se o objeto **se mover** em relação às estrelas de fundo de uma noite para a outra, é um **Cometa** (pois está orbitando o Sol).
* Se o objeto permanecer **estático** nas mesmas coordenadas, é uma **Nebulosa fixa** ou **Aglomerado** (catalogado para ser ignorado por caçadores de cometas).

---

## ☄️ A Simulação do Buraco Negro e o Método de Recorte

Na simulação, representamos um buraco negro utilizando o "mesmo método de recorte/aparência" que Messier veria para M71 ou outras nebulosas:

1. **Visão Histórica (1781):** O aglomerado globular **M71** e o **Buraco Negro** aparecem sob o mesmo método de renderização: um círculo difuso, acinzentado, de baixa resolução e com ruído óptico. Eles são visualmente idênticos, demonstrando o limite instrumental da época. Ambas as manchas permanecem estáticas entre as Noites 1, 2 e 3, classificando-os como objetos fixos do catálogo.
2. **Visão Moderna (Hubble / Espacial):** Ao ativar a tecnologia moderna, o "recorte" revela a natureza real de cada objeto:
   * **Messier 71 (M71):** É revelado como um aglomerado globular denso contendo centenas de estrelas individuais coloridas (gigantes vermelhas, gigantes azuis, estrelas brancas).
   * **Buraco Negro (M111):** É revelado como uma simulação física relativística interativa de um Buraco Negro Supermassivo!

---

## 🕳️ Recursos Físicos Simulados no Buraco Negro (Modo Moderno)

A simulação em Canvas renderiza conceitos da Teoria da Relatividade Geral de Einstein em tempo real:

* **Lenteamento Gravitacional (Gravitational Lensing):** O campo gravitacional do buraco negro curva o espaço-tempo, distorcendo a luz das estrelas ao fundo. Estrelas que passam perto da lente são esticadas em arcos circulares (os **Arcos de Einstein**).
* **Anel de Einstein (Einstein Ring):** A luz de fundo é magnificada e distorcida em um anel brilhante perfeito ao redor do horizonte de eventos.
* **Horizonte de Eventos (Event Horizon):** A esfera escura perfeita central de onde nenhuma luz consegue escapar.
* **Disco de Acreção Relativístico:** O disco de matéria orbitando o buraco negro. Devido à curvatura da luz, vemos a parte de trás do disco projetada acima e abaixo do horizonte de eventos, criando a silhueta clássica popularizada no filme *Interestelar*.
* **Doppler Beaming (Relativistic Beaming):** A matéria no disco de acreção gira em velocidades próximas à da luz. A parte que gira em direção ao observador (lado esquerdo) aparece muito mais brilhante e azulada, enquanto a parte que se afasta (lado direito) aparece mais escura e avermelhada.

---

## 🎮 Como Interagir

1. **Classificar Objetos:**
   * Vá ao painel de controle e selecione os objetos suspeitos (A, B ou C).
   * Alterne entre as Noites 1, 2 e 3.
   * Classifique como "Cometa" ou "Fixo". O Diário de Messier dará feedback em tempo real sobre seu sucesso.
2. **Experimento de Lenteamento (Modo Moderno):**
   * Selecione o **Objeto C (Buraco Negro)**.
   * Alterne para a Era **Hubble (Moderno)**.
   * **Arraste e Solte:** Clique dentro da ocular e arraste o buraco negro para movê-lo pelo campo estelar. Observe como a luz das estrelas de fundo é distorcida dinamicamente em tempo real!
   * **Ajuste a Massa:** Use o controle de massa para ver o Anel de Einstein e a curvatura da gravidade crescer e diminuir.
   * **Ajuste a Turbulência:** Altere a sensibilidade/contraste para simular distorções adicionais.

---

## 💻 Como Executar no PC

Como o projeto é feito puramente em HTML5, CSS3 e JavaScript baunilha, você não precisa instalar nenhuma dependência pesada para utilizá-lo!

### Método Rápido (Dois Cliques):
1. Navegue até a pasta `projetos_pessoais/buraco_negro`.
2. Dê um duplo clique no arquivo `index.html` para abri-lo em qualquer navegador moderno (Chrome, Firefox, Edge, Safari).

### Usando um Servidor Local (Opcional):
Se quiser executar em um servidor local leve:
```bash
# Se tiver Python instalado
python3 -m http.server 8000

# Se tiver Node.js/npx instalado
npx serve .
```
Depois, abra o navegador em `http://localhost:8000` (ou a porta indicada).

---

## Publicação

GitHub Pages:

```text
https://arteweyl.github.io/EHT-MLOps-Pipeline/
```

O deploy é feito automaticamente pelo workflow `.github/workflows/pages.yml` sempre que houver push na branch `main`.
