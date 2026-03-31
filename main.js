import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const texLoader = new THREE.TextureLoader();
let isMobile = window.innerWidth <= 768;

function initSquishEffect() {
    document.querySelectorAll('.squish-title').forEach(title => {
        if (!title.innerText.trim() || title.querySelectorAll('.squish-letter').length > 0) return;
        const originalText = title.innerText;
        title.innerHTML = originalText.split('').map(char => 
            `<span class="squish-letter">${char === ' ' ? '&nbsp;' : char}</span>`
        ).join('');
    });
}

function initHeroInteractions() {
    const nameContainer = document.querySelector('.name-container');
    const text = nameContainer.innerText;
    const chars = text.split('');
    
    nameContainer.innerHTML = chars.map((c, i) => `<span style="transition-delay: ${i * 0.05}s">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
    
    const glassOverlay = document.createElement('div');
    glassOverlay.className = 'glass-overlay';
    glassOverlay.innerHTML = nameContainer.innerHTML;
    nameContainer.appendChild(glassOverlay);

    setTimeout(() => document.querySelectorAll('.name-container span').forEach(s => s.classList.add('revealed')), 100);

    // Desktop only mouse move effect
    const updateMousePos = (e) => {
        if (window.innerWidth > 768) {
            const rect = nameContainer.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            nameContainer.style.setProperty('--x', `${x}px`);
            nameContainer.style.setProperty('--y', `${y}px`);
        }
    };

    nameContainer.addEventListener('mousemove', updateMousePos);
    nameContainer.addEventListener('mouseleave', () => {
        nameContainer.style.setProperty('--x', `-100%`);
        nameContainer.style.setProperty('--y', `-100%`);
    });

    initSquishEffect();
}
initHeroInteractions();

const draggables = document.querySelectorAll('.float-img');
let activeElement = null, offset = { x: 0, y: 0 };

function onStart(e) {
    activeElement = e.target.closest('.float-img');
    if (!activeElement) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    offset.x = clientX - activeElement.offsetLeft;
    offset.y = clientY - activeElement.offsetTop;
    activeElement.style.zIndex = "100";
    activeElement.style.animation = "none";
}

function onMove(e) {
    if (!activeElement) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    activeElement.style.left = (clientX - offset.x) + 'px';
    activeElement.style.top = (clientY - offset.y) + 'px';
}

function onEnd() { 
    if(activeElement) activeElement.style.zIndex = "15"; 
    activeElement = null; 
}

draggables.forEach(img => {
    img.addEventListener('mousedown', onStart);
    img.addEventListener('touchstart', onStart, {passive: true});
});
document.addEventListener('mousemove', onMove);
document.addEventListener('touchmove', onMove, {passive: false});
document.addEventListener('mouseup', onEnd);
document.addEventListener('touchend', onEnd);

const compContainer = document.getElementById('computer-canvas-container');
const compScene = new THREE.Scene();
const compCamera = new THREE.PerspectiveCamera(45, compContainer.clientWidth / compContainer.clientHeight, 0.1, 2000);
compCamera.position.set(0, 0, 5);
const compRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
compRenderer.setSize(compContainer.clientWidth, compContainer.clientHeight);
compRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
compContainer.appendChild(compRenderer.domElement);
compScene.add(new THREE.AmbientLight(0xffffff, 2.5));
const compLight = new THREE.DirectionalLight(0xffffff, 1.5);
compLight.position.set(5, 5, 5);
compScene.add(compLight);
const compControls = new OrbitControls(compCamera, compRenderer.domElement);
compControls.enableDamping = true;
compControls.enableZoom = false;

let pcModel;

new GLTFLoader().load('3d models/computer.glb', (gltf) => {
    pcModel = gltf.scene;
    pcModel.traverse((child) => {
        if (child.isMesh) {
            if (child.name.toLowerCase().includes('screen') || child.material.name.toLowerCase().includes('screen')) {
                child.material = new THREE.MeshStandardMaterial({ 
                    map: myPic, emissiveMap: myPic, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0.5
                });
            }
        }
    });
    let baseScale = window.innerWidth <= 768 ? 0.35 : 0.5;
    pcModel.scale.set(baseScale, baseScale, baseScale);
    pcModel.position.y = -0.5;
    compScene.add(pcModel);
});

const skContainer = document.getElementById('canvas-container');
const skScene = new THREE.Scene();
const skCamera = new THREE.PerspectiveCamera(40, skContainer.clientWidth / skContainer.clientHeight, 0.1, 1000);
skCamera.position.z = window.innerWidth <= 768 ? 50 : 35;
const skRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
skRenderer.setSize(skContainer.clientWidth, skContainer.clientHeight);
skRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
skContainer.appendChild(skRenderer.domElement);
skScene.add(new THREE.AmbientLight(0xffffff, 3));
const skDirLight = new THREE.DirectionalLight(0xffffff, 2);
skDirLight.position.set(5, 5, 10);
skScene.add(skDirLight);

const loader = new GLTFLoader();
const skModels = [];
const skFiles = ['3d models/canva.glb', '3d models/blender.glb', '3d models/adobe.glb', '3d models/ibispaint.glb'];
const skRaycaster = new THREE.Raycaster();
const skMouse = new THREE.Vector2();
let skSelectedModel = null;
let skIsDragging = false;
let skPrevMousePos = { x: 0, y: 0 };

skFiles.forEach((file, i) => {
    loader.load(file, (gltf) => {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const scale = 9 / Math.max(size.x, size.y, size.z);
        model.scale.setScalar(scale);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center.multiplyScalar(scale));
        const group = new THREE.Group();
        group.add(model);
        group.rotation.y = Math.PI; 
        skScene.add(group);
        let spacing = window.innerWidth <= 768 ? 12 : 11;
        skModels.push({ mesh: group, targetX: (i - 1.5) * spacing });
    });
});

function skStart(clientX, clientY) {
    const rect = skContainer.getBoundingClientRect();
    skMouse.x = ((clientX - rect.left) / skContainer.clientWidth) * 2 - 1;
    skMouse.y = -((clientY - rect.top) / skContainer.clientHeight) * 2 + 1;
    skRaycaster.setFromCamera(skMouse, skCamera);
    const intersects = skRaycaster.intersectObjects(skModels.map(m => m.mesh), true);
    if (intersects.length > 0) {
        let object = intersects[0].object;
        while (object.parent && object.parent !== skScene) { object = object.parent; }
        skSelectedModel = object;
        skIsDragging = true;
        skPrevMousePos = { x: clientX, y: clientY };
    }
}

skContainer.addEventListener('mousedown', (e) => skStart(e.clientX, e.clientY));
skContainer.addEventListener('touchstart', (e) => skStart(e.touches[0].clientX, e.touches[0].clientY), {passive: true});

function skMove(clientX, clientY) {
    if (skIsDragging && skSelectedModel) {
        const deltaX = clientX - skPrevMousePos.x;
        const deltaY = clientY - skPrevMousePos.y;
        skSelectedModel.rotation.y += deltaX * 0.01;
        skSelectedModel.rotation.x += deltaY * 0.01;
        skPrevMousePos = { x: clientX, y: clientY };
    }
}

document.addEventListener('mousemove', (e) => skMove(e.clientX, e.clientY));
document.addEventListener('touchmove', (e) => skMove(e.touches[0].clientX, e.touches[0].clientY));
document.addEventListener('mouseup', () => { skIsDragging = false; skSelectedModel = null; });
document.addEventListener('touchend', () => { skIsDragging = false; skSelectedModel = null; });

const jContainer = document.getElementById('journey-3d-container');
const jScene = new THREE.Scene();
const jCamera = new THREE.PerspectiveCamera(40, jContainer.clientWidth / jContainer.clientHeight, 0.1, 1000);
jCamera.position.z = window.innerWidth <= 768 ? 18 : 12;

const jRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
jRenderer.setSize(jContainer.clientWidth, jContainer.clientHeight);
jRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
jContainer.appendChild(jRenderer.domElement);
jScene.add(new THREE.AmbientLight(0xffffff, 2.8)); 

const jCategoryAssets = [
    ['img/digital art.png'], 
    ['img/project1.jpg', 'img/project2.jpg'], 
    ['img/snow.png', 'img/lightroom cat.png'] 
];

let currentGallery = [];
let jCurrentFocus = 0;
let autoSwapInterval;
let isUserClicked = false;

function buildGallery(index) {
    currentGallery.forEach(mesh => {
        mesh.userData.fadingOut = true;
    });

    const imgs = jCategoryAssets[index];
    const isMob = window.innerWidth <= 768;
    const spacing = isMob ? 0 : 7;
    const totalWidth = (imgs.length - 1) * spacing;

    imgs.forEach((img, i) => {
        const tex = texLoader.load(img);
        tex.colorSpace = THREE.SRGBColorSpace;
        
        const sizeW = isMob ? 8 : 6;
        const sizeH = isMob ? 10 : 8;
        
        const geometry = new THREE.PlaneGeometry(sizeW, sizeH);
        const material = new THREE.MeshStandardMaterial({ 
            map: tex, 
            side: THREE.DoubleSide, 
            transparent: true, 
            opacity: 0 
        });

        const mesh = new THREE.Mesh(geometry, material);
        
        mesh.position.x = (i * spacing) - (totalWidth / 2);
        if(isMob) {
            mesh.position.z = -i * 0.5; 
        } else {
            mesh.position.z = 0;
        }

        mesh.userData.fadingOut = false;
        
        jScene.add(mesh);
        currentGallery.push(mesh);
    });
}

window.handleJourneyNav = function(index, clicked = false) {
    if (clicked) { 
        isUserClicked = true; 
        clearInterval(autoSwapInterval); 
    }
    
    jCurrentFocus = index;
    buildGallery(index);

    document.querySelectorAll('.nav-item-side').forEach((item, i) => { 
        item.classList.toggle('active', i === index); 
    });

    document.querySelectorAll('.journey-overlay').forEach((o, i) => {
        if (i === index) {
            o.classList.add('active');
            setTimeout(() => { o.style.opacity = "1"; }, 10); 
            initSquishEffect(); 
        } else {
            o.classList.remove('active');
            o.style.opacity = "0";
        }
    });
};

function startAutoCycle() {
    autoSwapInterval = setInterval(() => {
        if (!isUserClicked) {
            let next = (jCurrentFocus + 1) % jCategoryAssets.length;
            handleJourneyNav(next);
        }
    }, 6000); 
}

function initHeartGlitter() {
    const container = document.getElementById('heart-glitter-container');
    const hScene = new THREE.Scene();
    const hCamera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    const hRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    hRenderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(hRenderer.domElement);
    const positions = new Float32Array(2000 * 3);
    for (let i = 0; i < 2000; i++) {
        const t = Math.random() * Math.PI * 2;
        let x = 16 * Math.pow(Math.sin(t), 3);
        let y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        positions[i * 3] = x * 0.3 * (1 + (Math.random() - 0.5) * 0.1);
        positions[i * 3 + 1] = y * 0.3 * (1 + (Math.random() - 0.5) * 0.1);
        positions[i * 3 + 2] = (Math.random() - 0.5) * 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.12, color: 0xffb6c1, transparent: true, opacity: 0.8 }));
    hScene.add(pts);
    hCamera.position.z = 15;
    function hAnim() { requestAnimationFrame(hAnim); pts.rotation.y += 0.005; hRenderer.render(hScene, hCamera); }
    hAnim();
}

const contactForm = document.getElementById('myContactForm');
if(contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = new FormData(contactForm);
        const thankYou = document.getElementById('thank-you-msg');
        const submitBtn = contactForm.querySelector('.submit-btn');
        submitBtn.textContent = "SENDING...";
        submitBtn.disabled = true;

        try {
            const response = await fetch(contactForm.action, {
                method: 'POST',
                body: data,
                headers: { 'Accept': 'application/json' }
            });
            if (response.ok) {
                thankYou.style.display = 'block';
                contactForm.reset();
            } else {
                alert("Oops! Problem sending. Try again.");
            }
        } catch (error) {
            alert("Error connecting to server.");
        } finally {
            submitBtn.textContent = "SEND MESSAGE";
            submitBtn.disabled = false;
            setTimeout(() => { thankYou.style.display = 'none'; }, 5000);
        }
    });
}

function animate() {
    requestAnimationFrame(animate);
    const scrollY = window.scrollY;
    const isMob = window.innerWidth <= 768;

    if (pcModel) {
        const pcSec = document.getElementById('computer-showcase');
        const pcProg = Math.max(0, Math.min(1, (scrollY - pcSec.offsetTop) / (pcSec.offsetHeight - window.innerHeight)));
        let baseS = isMob ? 0.35 : 0.5;
        let zoomFactor = isMob ? 0.5 : 1.5;
        const zoom = Math.min(1, pcProg / 0.5);
        let s = baseS + (zoom * zoomFactor);
        pcModel.scale.set(s, s, s);

        if (pcProg > 0.7) pcModel.rotation.y += 0.01;
        else pcModel.rotation.y = 0;

        if (pcProg > 0.3 && !isMob) {
            const slide = (pcProg - 0.3) / 0.7;
            compContainer.style.transform = `translateX(${20 * slide}%)`;
        } else if (isMob) {
            compContainer.style.transform = `translateY(${pcProg * 10}px)`;
        }
        document.getElementById('pc-intro').classList.toggle('active', pcProg > 0.7);
        compControls.update();
        compRenderer.render(compScene, compCamera);
    }

    const skSec = document.getElementById('skills');
    const skProg = Math.max(0, Math.min(1, (scrollY - skSec.offsetTop) / (skSec.offsetHeight - window.innerHeight)));
    skModels.forEach((m, i) => {
        let p = Math.max(0, Math.min(1, (skProg - (i * 0.08)) / 0.75));
        if (isMob) {
            m.mesh.position.x = (m.targetX * p) * 0.5; 
            m.mesh.position.z = (1 - p) * 20;
        } else {
            m.mesh.position.x = m.targetX * p;
        }
        if (skProg < 0.95) m.mesh.rotation.y = Math.PI * (1 - p);
        else if (!skIsDragging || skSelectedModel !== m.mesh) m.mesh.position.y = Math.sin(Date.now() * 0.002) * 0.5;
    });
    document.getElementById('labels').classList.toggle('active', skProg > 0.85);
    skRenderer.render(skScene, skCamera);

    for (let i = currentGallery.length - 1; i >= 0; i--) {
        const mesh = currentGallery[i];
        if (mesh.userData.fadingOut) {
            mesh.material.opacity -= 0.02; 
            if (mesh.material.opacity <= 0) { jScene.remove(mesh); currentGallery.splice(i, 1); }
        } else if (mesh.material.opacity < 1) { mesh.material.opacity += 0.02; }
    }
    jRenderer.render(jScene, jCamera);
}

animate();
window.onload = () => { initHeartGlitter(); handleJourneyNav(0); startAutoCycle(); };
window.addEventListener('scroll', () => {
    document.querySelectorAll('.reveal').forEach(el => {
        if (el.getBoundingClientRect().top < window.innerHeight * 0.85) el.classList.add('active');
    });
});
window.addEventListener('resize', () => {
    isMobile = window.innerWidth <= 768;
    compCamera.aspect = compContainer.clientWidth / compContainer.clientHeight; compCamera.updateProjectionMatrix(); compRenderer.setSize(compContainer.clientWidth, compContainer.clientHeight);
    skCamera.aspect = skContainer.clientWidth / skContainer.clientHeight; skCamera.updateProjectionMatrix(); skRenderer.setSize(skContainer.clientWidth, skContainer.clientHeight);
    jCamera.aspect = jContainer.clientWidth / jContainer.clientHeight; jCamera.updateProjectionMatrix(); jRenderer.setSize(jContainer.clientWidth, jContainer.clientHeight);
});
