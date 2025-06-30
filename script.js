const canvas = document.getElementById("canvas");
const graphics = new Graphics(canvas);
let tree, X, y, names, XTest, XTrain, yTest, yTrain;
let cameraX = 0, cameraY = 0, zoom = 0.01;

function resize() {
    graphics.resize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", resize);
resize();

document.getElementById("load").addEventListener("click", () => {
    const file = document.getElementById("file").files[0];
    if (file) {
        readCSV(file, (data) => {
            names = data.names;
            [X, y] = cleanData(data.X, data.y);
        });
    }
});

document.getElementById("train").addEventListener("click", () => {
    const testSize = Number(document.getElementById("test-size").value) || 0.2;
    [XTest, XTrain, yTest, yTrain] = trainTestSplit(X, y, testSize);

    if (XTest.length > 100000) {
        tree = new DecisionTree(XTrain, yTrain, undefined, undefined, undefined, Math.log10);
    } else if (XTest.length > 5000) {
        tree = new DecisionTree(XTrain, yTrain, undefined, undefined, undefined, Math.sqrt);
    } else {
        tree = new DecisionTree(XTrain, yTrain);
    }

    graphics.reset();
    displayTree(graphics, tree, names);
});

document.getElementById("test").addEventListener("click", () => {
    const accuracyScore = XTest.length > 0 ? accuracy(tree.evaluate(XTest), yTest) : accuracy(tree.evaluate(XTrain), yTrain);
    document.getElementById("accuracy").textContent = `Accuracy ${accuracyScore}`;
});

document.getElementById("classify").addEventListener("click", () => {
    const instance = document.getElementById("instance").value.split(",").map((val) => isNaN(Number(val)) ? val : Number(val));
    const classification = tree.evaluate(instance);
    document.getElementById("classification").textContent = `Classification: ${classification}`;
});


//testing
let isDragging = false;
let lastX = 0, lastY = 0;
let lastMs = 0;

function animate() {
    graphics.setCamera(cameraX, cameraY, zoom);
    let start = Date.now();
    graphics.update();
    end = Date.now();
    if (Math.abs(end - start - lastMs) > 1) {
        lastMs = end - start;
        console.log(lastMs);
    }
    requestAnimationFrame(animate);
}

canvas.addEventListener("mousedown", (event) => {
    isDragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
});
canvas.addEventListener("mouseup", () => {
    isDragging = false;
});
canvas.addEventListener("mousemove", (event) => {
    if (isDragging) {
        const dx = event.clientX - lastX;
        const dy = event.clientY - lastY;
        cameraX -= dx / zoom;
        cameraY -= dy / zoom;
        lastX = event.clientX;
        lastY = event.clientY;
    }
});
canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    zoom *= event.deltaY < 0 ? 1.1 : 0.9;
});
animate()

const touchIds = new Set();
let initialPinchDistance = 1;
let initialZoom = 1;
function getTouches(event) {
    const touches = [];
    for (const touch of event.touches) {
        if (touchIds.has(touch.identifier)) {
            touches.push(touch);
        }
    }
    return touches;
}
canvas.addEventListener("touchstart", (event) => {
    for (const touch of event.changedTouches) {
        touchIds.add(touch.identifier);
    }
    const touches = getTouches(event);
    if (touches.length >= 2) {
        const xDistance = touches[0].clientX - touches[1].clientX;
        const yDistance = touches[0].clientY - touches[1].clientY;
        initialPinchDistance = Math.sqrt(xDistance ** 2 + yDistance ** 2);
        initialZoom = zoom;
        lastX = (touches[0].clientX + touches[1].clientX) / 2;
        lastY = (touches[0].clientY + touches[1].clientY) / 2;
    } else {
        lastX = touches[0].clientX;
        lastY = touches[0].clientY;
    }
    event.preventDefault();
}, { passive: false });
canvas.addEventListener("touchend", (event) => {
    for (const touch of event.changedTouches) {
        touchIds.delete(touch.identifier);
    }
    const touches = getTouches(event);
    if (touches.length === 1) {
        lastX = touches[0].clientX;
        lastY = touches[0].clientY;
    }
});
canvas.addEventListener("touchmove", (event) => {
    const touches = getTouches(event);
    if (touches.length >= 1) {
        let currentX = touches[0].clientX;
        let currentY = touches[0].clientY;
        if (touches.length >= 2) {
            const xDistance = touches[0].clientX - touches[1].clientX;
            const yDistance = touches[0].clientY - touches[1].clientY;
            const distance = Math.sqrt(xDistance ** 2 + yDistance ** 2);
            zoom = initialZoom * (distance / initialPinchDistance);
            currentX = (touches[0].clientX + touches[1].clientX) / 2;
            currentY = (touches[0].clientY + touches[1].clientY) / 2;
        }
        const dx = currentX - lastX;
        const dy = currentY - lastY;
        cameraX -= dx / zoom;
        cameraY -= dy / zoom;
        lastX = currentX;
        lastY = currentY;
    }
    event.preventDefault();
}, { passive: false });


//more testing
let start = Date.now();
let size = 1e8;
let center = { x: 0, y: 0 };
for (let i = 0; i < 23; i++) {
    graphics.addCircle(
        center.x,
        center.y,
        size + size / 10,
        size / 10,
        `#${(Math.floor(Math.random() * 256 ** 3)).toString(16).padStart(6, "0")}`
    )
    center.x += Math.random() * size / Math.sqrt(2) - size / Math.sqrt(2) / 2;
    center.y += Math.random() * size / Math.sqrt(2) - size / Math.sqrt(2) / 2
    size /= 2;
}
console.log(Date.now() - start);

const radius = 5000;
function randomXY() {
    let angle = Math.random() * 2 * Math.PI;
    let distance = Math.sqrt(Math.random()) * radius;
    let x = Math.cos(angle) * distance;
    let y = Math.sin(angle) * distance;
    return { x: x, y: y };
}

start = Date.now();
for (i = 0; i < 3250; i++) {
    let sizeX = Math.random() * 90 + 10;
    let sizeY = Math.random() * 90 + 10;
    let xy = randomXY();
    graphics.addRectangle(
        xy.x,
        xy.y,
        sizeX,
        sizeY,
        5,
        `#${(Math.floor(Math.random() * 256 ** 3)).toString(16).padStart(6, "0")}`,
        undefined,
        99 - Math.floor(Math.min(sizeX, sizeY))
    )
}
console.log(Date.now() - start);

start = Date.now();
for (i = 0; i < 3250; i++) {
    let size = Math.random() * 95 + 5;
    let xy = randomXY();
    graphics.addCircle(
        xy.x,
        xy.y,
        size,
        5,
        `#${(Math.floor(Math.random() * 256 ** 3)).toString(16).padStart(6, "0")}`,
        undefined,
        99 - Math.floor(size)
    )
}
console.log(Date.now() - start);

start = Date.now();
for (i = 0; i < 3250; i++) {
    let size = Math.random() * 200 + 50;
    let xy = randomXY();
    graphics.addText(
        xy.x,
        xy.y,
        "h" + Array.from({ length: Math.floor(i / 100) + 1 }, () => "i").join(" "),
        { weight: 700, size: Math.floor(Math.random() * 15) + 5 },
        size,
        `#${(Math.floor(Math.random() * 256 ** 3)).toString(16).padStart(6, "0")}`,
        99
    )
}
console.log(Date.now() - start);

const figCount = Object.keys(graphics.figures).length;
start = Date.now();
for (i = 0; i < 250; i++) {
    let fig1 = graphics.figures[Math.floor(Math.random() * figCount)];
    let fig2 = graphics.figures[Math.floor(Math.random() * figCount)];
    let size = Math.random() * 10;
    graphics.addLine(
        fig1.x,
        fig1.y,
        fig2.x,
        fig2.y,
        size,
        fig1.color,
        Math.min(fig1.zIndex, fig2.zIndex) - 1
    )
}
console.log(Date.now() - start);

X = Array.from({ length: 5000 }, () => Array.from({ length: 5 }, () => Math.floor(Math.random() * 1000)));
y = Array.from({ length: 5000 }, (k, i) => X[i].reduce((a, b) => a + b) > 3000 ? 1 : 0);
names = ["a", "b", "c", "d", "e"];