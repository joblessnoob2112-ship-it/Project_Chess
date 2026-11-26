
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Chess } from 'chess.js';
import './style.css';

// =====================================
// 1. GAME VARIABLES
// =====================================

const container = document.getElementById('chess-scene');
const game = new Chess();

let viewMode = '3d';
let boardTheme = 'green';
let flipped = false;
let selectedSquare = null;
let legalMoves = [];
let lastMove = null;
let pieces = [];
let squares = [];

const palettes = {
  green: ['#eeeed2', '#779954'],
  wood: ['#ead5b4', '#96633e'],
  blue: ['#e5eaf0', '#6489b4']
};

const symbols = {
  wk: '♔', wq: '♕', wr: '♖', wb: '♗', wn: '♘', wp: '♙',
  bk: '♚', bq: '♛', br: '♜', bb: '♝', bn: '♞', bp: '♟'
};

// =====================================
// 2. THREE.JS SCENE
// =====================================

const scene = new THREE.Scene();
scene.background = new THREE.Color('#292d28');

const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
camera.position.set(7, 9, 11);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.minDistance = 7;
controls.maxDistance = 17;
controls.maxPolarAngle = Math.PI / 2.05;

scene.add(new THREE.HemisphereLight('#fff2d5', '#414a3d', 2));

const sunlight = new THREE.DirectionalLight('#fff0d0', 3);
sunlight.position.set(-5, 10, 7);
sunlight.castShadow = true;
sunlight.shadow.mapSize.set(1024, 1024);
scene.add(sunlight);

const fillLight = new THREE.PointLight('#c5d7ff', 18, 30);
fillLight.position.set(5, 5, -5);
scene.add(fillLight);

const boardGroup = new THREE.Group();
scene.add(boardGroup);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(100, 100),
  new THREE.MeshStandardMaterial({ color: '#292d28' })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.48;
floor.receiveShadow = true;
scene.add(floor);

// =====================================
// 3. 3D OBJECT HELPERS
// =====================================

function addMesh(geometry, material, parent, x, y, z) {
  const mesh = new THREE.Mesh(geometry, material);

  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  parent.add(mesh);
  return mesh;
}

function createPiece(type, color) {
  const group = new THREE.Group();

  const material = new THREE.MeshStandardMaterial({
    color: color === 'w' ? '#f5ead5' : '#292d2a',
    roughness: 0.3,
    metalness: 0.12
  });

  const gold = new THREE.MeshStandardMaterial({
    color: '#bd9a56',
    metalness: 0.55,
    roughness: 0.3
  });

  function cylinder(top, bottom, height, y, mat = material) {
    return addMesh(
      new THREE.CylinderGeometry(top, bottom, height, 28),
      mat, group, 0, y, 0
    );
  }

  function sphere(radius, y, mat = material) {
    return addMesh(
      new THREE.SphereGeometry(radius, 20, 16),
      mat, group, 0, y, 0
    );
  }

  function cone(radius, height, y, mat = material) {
    return addMesh(
      new THREE.ConeGeometry(radius, height, 28),
      mat, group, 0, y, 0
    );
  }

  // Common pedestal
  cylinder(0.31, 0.35, 0.10, 0.08);
  cylinder(0.27, 0.31, 0.08, 0.17, gold);
  cylinder(0.20, 0.26, 0.12, 0.27);
  cylinder(0.14, 0.20, 0.10, 0.38);

  if (type === 'p') {
    cylinder(0.13, 0.17, 0.23, 0.53);
    sphere(0.16, 0.73);
  }

  if (type === 'r') {
    cylinder(0.16, 0.19, 0.30, 0.57);
    cylinder(0.23, 0.22, 0.10, 0.77);
    cylinder(0.22, 0.22, 0.09, 0.87);

    for (let i = 0; i < 4; i++) {
      const angle = i * Math.PI / 2;

      addMesh(
        new THREE.BoxGeometry(0.12, 0.13, 0.12),
        material,
        group,
        Math.sin(angle) * 0.15,
        0.98,
        Math.cos(angle) * 0.15
      );
    }
  }

  if (type === 'n') {
    cylinder(0.15, 0.19, 0.27, 0.57);

    const neck = addMesh(
      new THREE.CapsuleGeometry(0.12, 0.30, 4, 10),
      material, group, 0, 0.83, 0
    );

    neck.rotation.z = -0.25;
    neck.rotation.x = -0.3;

    const head = sphere(0.15, 1.03);
    head.position.z = -0.12;

    cone(0.09, 0.20, 1.17);
  }

  if (type === 'b') {
    cylinder(0.13, 0.18, 0.29, 0.57);
    cone(0.20, 0.36, 0.88);
    sphere(0.08, 1.09);
    cone(0.06, 0.14, 1.20, gold);
  }

  if (type === 'q') {
    cylinder(0.14, 0.19, 0.30, 0.57);
    cone(0.22, 0.37, 0.89);
    sphere(0.08, 1.11, gold);

    for (let i = 0; i < 5; i++) {
      const angle = i * Math.PI * 2 / 5;

      const ball = sphere(0.055, 1.08);
      ball.position.set(
        Math.sin(angle) * 0.18,
        1.08,
        Math.cos(angle) * 0.18
      );
    }
  }

  if (type === 'k') {
    cylinder(0.14, 0.19, 0.31, 0.57);
    cone(0.21, 0.36, 0.89);
    cylinder(0.075, 0.075, 0.23, 1.19, gold);
    cylinder(0.18, 0.18, 0.06, 1.22, gold);
    cylinder(0.055, 0.055, 0.18, 1.34, gold);
    cylinder(0.13, 0.13, 0.05, 1.44, gold);
  }

  return group;
}

// =====================================
// 4. BOARD CLEANUP
// =====================================

function clear3DBoard() {
  for (const object of [...pieces, ...squares]) {
    boardGroup.remove(object);

    object.traverse(child => {
      if (child.isMesh) {
        child.geometry.dispose();
      }
    });
  }

  pieces = [];
  squares = [];
}

// =====================================
// 5. BUILD 3D BOARD
// =====================================

function draw3DBoard() {
  clear3DBoard();

  const palette = palettes[boardTheme];

  const wood = new THREE.MeshStandardMaterial({
    color: boardTheme === 'wood' ? '#70492e' : '#594536',
    roughness: 0.4
  });

  addMesh(
    new THREE.BoxGeometry(8.3, 0.25, 8.3),
    wood, boardGroup, 0, -0.17, 0
  );

  // Board squares
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const material = new THREE.MeshStandardMaterial({
        color: (row + col) % 2 === 0 ? palette[0] : palette[1],
        roughness: 0.5
      });

      const square = addMesh(
        new THREE.BoxGeometry(1, 0.07, 1),
        material,
        boardGroup,
        col - 3.5,
        -0.025,
        row - 3.5
      );

      squares.push(square);
    }
  }

  // Selected square and legal moves
  const highlights = [];

  if (selectedSquare) highlights.push(selectedSquare);

  for (const move of legalMoves) {
    highlights.push(move.to);
  }

  if (lastMove) {
    highlights.push(lastMove.from, lastMove.to);
  }

  const uniqueHighlights = [...new Set(highlights)];

  for (const square of uniqueHighlights) {
    const col = square.charCodeAt(0) - 97;
    const row = 8 - Number(square[1]);

    const highlight = addMesh(
      new THREE.BoxGeometry(0.98, 0.012, 0.98),
      new THREE.MeshBasicMaterial({
        color: square === selectedSquare ? '#45d9dc' : '#e9d95c',
        transparent: true,
        opacity: 0.4
      }),
      boardGroup,
      col - 3.5,
      0.025,
      row - 3.5
    );

    squares.push(highlight);
  }

  // Place chess pieces
  const position = game.board();

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const data = position[row][col];
      if (!data) continue;

      const piece = createPiece(data.type, data.color);

      piece.position.set(
        col - 3.5,
        0.02,
        row - 3.5
      );

      boardGroup.add(piece);
      pieces.push(piece);
    }
  }
}

// =====================================
// 6. BUILD 2D BOARD
// =====================================

function draw2DBoard() {
  container.innerHTML = '';

  const grid = document.createElement('div');
  grid.className = 'flat-board';

  const position = game.board();
  const palette = palettes[boardTheme];

  for (let screenRow = 0; screenRow < 8; screenRow++) {
    for (let screenCol = 0; screenCol < 8; screenCol++) {

      const row = flipped ? 7 - screenRow : screenRow;
      const col = flipped ? 7 - screenCol : screenCol;

      const square = 'abcdefgh'[col] + (8 - row);

      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'flat-square';

      cell.style.backgroundColor =
        (row + col) % 2 === 0 ? palette[0] : palette[1];

      if (lastMove && (square === lastMove.from || square === lastMove.to)) {
        cell.classList.add('last-move');
      }

      if (square === selectedSquare) {
        cell.classList.add('selected');
      }

      const piece = position[row][col];

      if (piece) {
        const span = document.createElement('span');

        span.className = piece.color === 'w'
          ? 'flat-white-piece'
          : 'flat-black-piece';

        span.textContent = symbols[piece.color + piece.type];

        cell.appendChild(span);
      }

      const legal = legalMoves.find(move => move.to === square);

      if (legal) {
        cell.classList.add(
          piece ? 'legal-capture' : 'legal-target'
        );
      }

      cell.addEventListener('click', () => handleSquareClick(square));

      grid.appendChild(cell);
    }
  }

  container.appendChild(grid);
}

// =====================================
// 7. BUILD HYBRID BOARD
// =====================================

function drawHybridBoard() {
  clear3DBoard();

  const palette = palettes[boardTheme];

  // Flat squares as thin 3D planes
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const material = new THREE.MeshStandardMaterial({
        color: (row + col) % 2 === 0 ? palette[0] : palette[1],
        roughness: 0.7
      });

      addMesh(
        new THREE.BoxGeometry(1, 0.035, 1),
        material,
        boardGroup,
        col - 3.5,
        0,
        row - 3.5
      );
    }
  }

  // Add pieces
  const position = game.board();

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const data = position[row][col];
      if (!data) continue;

      const piece = createPiece(data.type, data.color);

      piece.position.set(
        col - 3.5,
        0.04,
        row - 3.5
      );

      boardGroup.add(piece);
      pieces.push(piece);
    }
  }

  // Highlights
  const highlightSquares = [
    ...(selectedSquare ? [selectedSquare] : []),
    ...legalMoves.map(move => move.to),
    ...(lastMove ? [lastMove.from, lastMove.to] : [])
  ];

  for (const square of new Set(highlightSquares)) {
    const col = square.charCodeAt(0) - 97;
    const row = 8 - Number(square[1]);

    const highlight = addMesh(
      new THREE.BoxGeometry(0.95, 0.012, 0.95),
      new THREE.MeshBasicMaterial({
        color: square === selectedSquare ? '#45d9dc' : '#e9d95c',
        transparent: true,
        opacity: 0.45
      }),
      boardGroup,
      col - 3.5,
      0.025,
      row - 3.5
    );

    squares.push(highlight);
  }
}

// =====================================
// 8. RENDER BOARD
// =====================================

function configureCamera() {
  if (viewMode === '3d') {
    camera.position.set(7, 9, 11);
    camera.up.set(0, 1, 0);
    controls.enabled = true;
    controls.target.set(0, 0, 0);
    controls.update();
  } else {
    camera.position.set(0, 12, 0);
    camera.up.set(0, 0, -1);
    camera.lookAt(0, 0, 0);
    controls.enabled = false;
  }

  boardGroup.rotation.y = flipped ? Math.PI : 0;
}

function renderBoard() {
  if (viewMode === '2d') {
    renderer.domElement.style.display = 'none';
    draw2DBoard();
    updateInterface();
    return;
  }

  if (renderer.domElement.parentElement !== container) {
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
  }

  renderer.domElement.style.display = 'block';

  if (viewMode === 'hybrid') {
    drawHybridBoard();
  } else {
    draw3DBoard();
  }

  configureCamera();
  resizeRenderer();
  updateInterface();
}

// =====================================
// 9. CHESS MOVEMENT
// =====================================

function handleSquareClick(square) {
  if (game.isGameOver()) return;

  const clickedPiece = game.get(square);

  if (selectedSquare) {
    try {
      const move = game.move({
        from: selectedSquare,
        to: square,
        promotion: 'q'
      });

      if (move) {
        lastMove = move;
        selectedSquare = null;
        legalMoves = [];
        renderBoard();
        return;
      }
    } catch {
      // Illegal move: keep the game position unchanged.
    }
  }

  if (clickedPiece && clickedPiece.color === game.turn()) {
    selectedSquare = square;
    legalMoves = game.moves({
      square,
      verbose: true
    });
  } else {
    selectedSquare = null;
    legalMoves = [];
  }

  renderBoard();
}

// =====================================
// 10. 3D BOARD CLICK DETECTION
// =====================================

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

const boardPlane = new THREE.Plane(
  new THREE.Vector3(0, 1, 0),
  0
);

renderer.domElement.addEventListener('pointerdown', event => {
  if (viewMode === '2d' || event.button !== 0) return;

  const rect = renderer.domElement.getBoundingClientRect();

  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  const point = new THREE.Vector3();

  if (!raycaster.ray.intersectPlane(boardPlane, point)) return;

  let col = Math.floor(point.x + 4);
  let row = Math.floor(point.z + 4);

  if (col < 0 || col > 7 || row < 0 || row > 7) return;

  if (flipped) {
    col = 7 - col;
    row = 7 - row;
  }

  const square = 'abcdefgh'[col] + (8 - row);

  handleSquareClick(square);
});

// =====================================
// 11. MOVE HISTORY AND GAME STATUS
// =====================================

function updateInterface() {
  const moves = game.history();
  const history = document.getElementById('move-history');

  history.innerHTML = '';

  if (!moves.length) {
    history.textContent = 'No moves yet.';
  } else {
    for (let i = 0; i < moves.length; i += 2) {
      const number = document.createElement('span');
      number.className = 'history-number';
      number.textContent = `${i / 2 + 1}.`;

      const white = document.createElement('span');
      white.textContent = moves[i];

      const black = document.createElement('span');
      black.textContent = moves[i + 1] || '';

      history.append(number, white, black);
    }
  }

  const statusTitle = document.getElementById('status-title');
  const statusMessage = document.getElementById('status-message');
  const turnLabel = document.getElementById('turn-label');

  if (game.isCheckmate()) {
    const winner = game.turn() === 'w' ? 'Black' : 'White';
    statusTitle.textContent = 'Checkmate!';
    statusMessage.textContent = `${winner} wins!`;
    turnLabel.textContent = `🏆 ${winner} wins!`;
  } else if (game.isDraw()) {
    statusTitle.textContent = 'Game drawn';
    statusMessage.textContent = 'The game has ended.';
    turnLabel.textContent = 'Game drawn';
  } else {
    const player = game.turn() === 'w' ? 'White' : 'Black';

    statusTitle.textContent = game.isCheck() ? 'Check!' : `${player}'s turn`;
    statusMessage.textContent = game.isCheck()
      ? 'Your king is in check.'
      : 'Select a piece to move.';

    turnLabel.innerHTML = `<span class="online-dot"></span>${player} to move`;
  }

  document.getElementById('black-captured').textContent =
    getCapturedPieces('b');

  document.getElementById('white-captured').textContent =
    getCapturedPieces('w');
}

function getCapturedPieces(color) {
  const original = { p: 8, n: 2, b: 2, r: 2, q: 1 };
  const current = { p: 0, n: 0, b: 0, r: 0, q: 0 };

  for (const row of game.board()) {
    for (const piece of row) {
      if (piece && piece.color === color) {
        current[piece.type]++;
      }
    }
  }

  let result = '';

  const pieceSymbols = color === 'w'
    ? { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕' }
    : { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛' };

  for (const type of ['q', 'r', 'b', 'n', 'p']) {
    for (let i = current[type]; i < original[type]; i++) {
      result += pieceSymbols[type];
    }
  }

  return result;
}

// =====================================
// 12. GAME CONTROLS
// =====================================

document.getElementById('new-game').addEventListener('click', () => {
  game.reset();

  selectedSquare = null;
  legalMoves = [];
  lastMove = null;

  renderBoard();
});

document.getElementById('undo-move').addEventListener('click', () => {
  const undone = game.undo();

  if (!undone) return;

  selectedSquare = null;
  legalMoves = [];

  const history = game.history({ verbose: true });
  lastMove = history.length ? history[history.length - 1] : null;

  renderBoard();
});

document.getElementById('flip-board').addEventListener('click', () => {
  flipped = !flipped;
  renderBoard();
});

document.getElementById('view-mode').addEventListener('change', event => {
  viewMode = event.target.value;
  renderBoard();
});

document.getElementById('board-theme').addEventListener('change', event => {
  boardTheme = event.target.value;
  renderBoard();
});

document.getElementById('reset-camera').addEventListener('click', () => {
  configureCamera();
  resizeRenderer();
});

// =====================================
// 13. RESPONSIVE RESIZING
// =====================================

function resizeRenderer() {
  const width = container.clientWidth;
  const height = container.clientHeight;

  if (!width || !height) return;

  renderer.setSize(width, height);

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

const resizeObserver = new ResizeObserver(() => {
  if (viewMode !== '2d') {
    resizeRenderer();
  }
});

resizeObserver.observe(container);

// =====================================
// 14. START GAME
// =====================================

renderBoard();

function animate() {
  requestAnimationFrame(animate);

  if (viewMode !== '2d') {
    controls.update();
    renderer.render(scene, camera);
  }
}

animate();
