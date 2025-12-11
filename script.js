// הגדרות בסיסיות
let scene, camera, renderer, controls;
let proteinGroup;
let isAnimating = false;
let animationFrame = 0;
let maxFrames = 100;
let foldingSpeed = 1.0;

// Fallback OrbitControls אם הספרייה לא נטענת
if (typeof THREE !== 'undefined' && !THREE.OrbitControls) {
    THREE.OrbitControls = function(camera, domElement) {
        this.object = camera;
        this.domElement = domElement;
        this.enableDamping = true;
        this.dampingFactor = 0.05;
        this.minDistance = 5;
        this.maxDistance = 100;
        
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };
        let rotationX = 0;
        let rotationY = 0;
        let distance = 30;
        
        const updateCamera = () => {
            const x = distance * Math.sin(rotationY) * Math.cos(rotationX);
            const y = distance * Math.sin(rotationX);
            const z = distance * Math.cos(rotationY) * Math.cos(rotationX);
            camera.position.set(x, y, z);
            camera.lookAt(0, 0, 0);
        };
        
        updateCamera();
        
        const onMouseDown = (event) => {
            isDragging = true;
            previousMousePosition = { x: event.clientX, y: event.clientY };
        };
        
        const onMouseMove = (event) => {
            if (!isDragging) return;
            
            const deltaX = (event.clientX - previousMousePosition.x) * 0.01;
            const deltaY = (event.clientY - previousMousePosition.y) * 0.01;
            
            rotationY -= deltaX;
            rotationX -= deltaY;
            rotationX = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, rotationX));
            
            previousMousePosition = { x: event.clientX, y: event.clientY };
            updateCamera();
        };
        
        const onMouseUp = () => {
            isDragging = false;
        };
        
        const onWheel = (event) => {
            event.preventDefault();
            const delta = event.deltaY;
            distance += delta * 0.1;
            distance = Math.max(this.minDistance, Math.min(this.maxDistance, distance));
            updateCamera();
        };
        
        domElement.addEventListener('mousedown', onMouseDown);
        domElement.addEventListener('mousemove', onMouseMove);
        domElement.addEventListener('mouseup', onMouseUp);
        domElement.addEventListener('wheel', onWheel);
        
        this.update = () => {
            // כבר מעודכן ב-onMouseMove
        };
    };
}

// מצבי ייצוג
let currentRepresentation = 'ribbon';
let showAtoms = true;
let showBonds = true;

// נתוני חלבון לדוגמה (מבנה אלפא-הליקס פשוט)
const proteinData = {
    atoms: [],
    bonds: []
};

// יצירת מבנה חלבון לדוגמה
function generateProteinStructure() {
    const atoms = [];
    const bonds = [];
    
    // יצירת מבנה אלפא-הליקס פשוט
    const numResidues = 20;
    const radius = 2.0;
    const pitch = 3.6;
    
    for (let i = 0; i < numResidues; i++) {
        const angle = (i * 100) * Math.PI / 180;
        const x = radius * Math.cos(angle);
        const y = i * pitch / numResidues;
        const z = radius * Math.sin(angle);
        
        // אטום מרכזי (C-alpha)
        atoms.push({
            id: i,
            type: 'CA',
            x: x,
            y: y,
            z: z,
            color: 0x00ff00
        });
        
        // יצירת קשרים
        if (i > 0) {
            bonds.push({
                from: i - 1,
                to: i
            });
        }
    }
    
    return { atoms, bonds };
}

// אתחול Scene
function init() {
    // יצירת Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    
    // יצירת Camera
    const container = document.getElementById('canvas-container');
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 10, 30);
    camera.lookAt(0, 0, 0);
    
    // יצירת Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    
    // יצירת Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 100;
    
    // תאורה
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(10, 10, 10);
    scene.add(directionalLight1);
    
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-10, -10, -10);
    scene.add(directionalLight2);
    
    // יצירת קבוצת חלבון
    proteinGroup = new THREE.Group();
    scene.add(proteinGroup);
    
    // יצירת מבנה חלבון
    const structure = generateProteinStructure();
    proteinData.atoms = structure.atoms;
    proteinData.bonds = structure.bonds;
    
    // עדכון מצב התחלתי (לא מקופל)
    updateProteinStructure(0);
    
    // עדכון מידע
    updateInfo();
    
    // טיפול בשינוי גודל חלון
    window.addEventListener('resize', onWindowResize);
    
    // אנימציה
    animate();
}

// עדכון מבנה החלבון לפי שלב הקיפול
function updateProteinStructure(foldingProgress) {
    // ניקוי מבנה קודם
    proteinGroup.clear();
    
    const atoms = proteinData.atoms;
    const bonds = proteinData.bonds;
    
    // מצב לא מקופל - כל האטומים במיקום אקראי
    // מצב מקופל - אטומים במבנה הסופי
    const unfoldedPositions = [];
    const foldedPositions = [];
    
    // יצירת מיקומים לא מקופלים (אקראיים)
    atoms.forEach((atom, index) => {
        unfoldedPositions.push({
            x: (Math.random() - 0.5) * 20,
            y: (Math.random() - 0.5) * 20,
            z: (Math.random() - 0.5) * 20
        });
        
        foldedPositions.push({
            x: atom.x,
            y: atom.y,
            z: atom.z
        });
    });
    
    // אינטרפולציה בין מצב לא מקופל למקופל
    atoms.forEach((atom, index) => {
        const unfolded = unfoldedPositions[index];
        const folded = foldedPositions[index];
        
        atom.currentX = unfolded.x + (folded.x - unfolded.x) * foldingProgress;
        atom.currentY = unfolded.y + (folded.y - unfolded.y) * foldingProgress;
        atom.currentZ = unfolded.z + (folded.z - unfolded.z) * foldingProgress;
    });
    
    // יצירת אטומים
    if (showAtoms) {
        atoms.forEach((atom) => {
            const geometry = new THREE.SphereGeometry(0.5, 16, 16);
            const material = new THREE.MeshPhongMaterial({ 
                color: atom.color || 0x00ff00,
                emissive: atom.color || 0x00ff00,
                emissiveIntensity: 0.3
            });
            const sphere = new THREE.Mesh(geometry, material);
            sphere.position.set(atom.currentX, atom.currentY, atom.currentZ);
            proteinGroup.add(sphere);
        });
    }
    
    // יצירת קשרים
    if (showBonds) {
        bonds.forEach((bond) => {
            const fromAtom = atoms[bond.from];
            const toAtom = atoms[bond.to];
            
            if (fromAtom && toAtom) {
                const geometry = new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(fromAtom.currentX, fromAtom.currentY, fromAtom.currentZ),
                    new THREE.Vector3(toAtom.currentX, toAtom.currentY, toAtom.currentZ)
                ]);
                
                const material = new THREE.LineBasicMaterial({ 
                    color: 0xffffff,
                    linewidth: 2,
                    opacity: 0.6,
                    transparent: true
                });
                
                const line = new THREE.Line(geometry, material);
                proteinGroup.add(line);
            }
        });
    }
    
    // ייצוג Ribbon
    if (currentRepresentation === 'ribbon' || currentRepresentation === 'cartoon') {
        createRibbonRepresentation(atoms, foldingProgress);
    }
}

// יצירת ייצוג Ribbon
function createRibbonRepresentation(atoms, foldingProgress) {
    if (atoms.length < 2) return;
    
    const points = [];
    atoms.forEach((atom) => {
        points.push(new THREE.Vector3(atom.currentX, atom.currentY, atom.currentZ));
    });
    
    const curve = new THREE.CatmullRomCurve3(points);
    const geometry = new THREE.TubeGeometry(curve, atoms.length * 2, 0.3, 8, false);
    const material = new THREE.MeshPhongMaterial({
        color: 0x00aaff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7
    });
    const tube = new THREE.Mesh(geometry, material);
    proteinGroup.add(tube);
}

// אנימציה
function animate() {
    requestAnimationFrame(animate);
    
    if (isAnimating) {
        animationFrame += 0.02 * foldingSpeed;
        
        if (animationFrame >= maxFrames) {
            animationFrame = maxFrames;
            isAnimating = false;
            document.getElementById('play-pause').textContent = '▶ התחל קיפול';
        }
        
        const progress = animationFrame / maxFrames;
        updateProteinStructure(progress);
        updateFoldingStage(progress);
    }
    
    controls.update();
    renderer.render(scene, camera);
}

// עדכון שלב הקיפול
function updateFoldingStage(progress) {
    const percentage = Math.round(progress * 100);
    document.getElementById('folding-stage').textContent = percentage + '%';
}

// עדכון מידע
function updateInfo() {
    document.getElementById('atom-count').textContent = proteinData.atoms.length;
    document.getElementById('bond-count').textContent = proteinData.bonds.length;
}

// טיפול בשינוי גודל חלון
function onWindowResize() {
    const container = document.getElementById('canvas-container');
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

// Event Listeners
document.getElementById('play-pause').addEventListener('click', () => {
    isAnimating = !isAnimating;
    if (isAnimating) {
        document.getElementById('play-pause').textContent = '⏸ עצור';
    } else {
        document.getElementById('play-pause').textContent = '▶ המשך';
    }
});

document.getElementById('reset').addEventListener('click', () => {
    isAnimating = false;
    animationFrame = 0;
    updateProteinStructure(0);
    updateFoldingStage(0);
    document.getElementById('play-pause').textContent = '▶ התחל קיפול';
});

document.getElementById('folding-speed').addEventListener('input', (e) => {
    foldingSpeed = parseFloat(e.target.value);
    document.getElementById('speed-value').textContent = foldingSpeed.toFixed(1) + 'x';
});

document.getElementById('representation').addEventListener('change', (e) => {
    currentRepresentation = e.target.value;
    const progress = animationFrame / maxFrames;
    updateProteinStructure(progress);
});

document.getElementById('show-atoms').addEventListener('change', (e) => {
    showAtoms = e.target.checked;
    const progress = animationFrame / maxFrames;
    updateProteinStructure(progress);
});

document.getElementById('show-bonds').addEventListener('change', (e) => {
    showBonds = e.target.checked;
    const progress = animationFrame / maxFrames;
    updateProteinStructure(progress);
});

// אתחול כאשר הדף נטען
window.addEventListener('load', init);

