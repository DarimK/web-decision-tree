const canvas = document.getElementById("canvas");
const graphics = new Graphics(canvas);
let tree, X, y, names, types, XTest, XTrain, yTest, yTrain;
let cameraX = 0, cameraY = 10000, zoom = 0.01;

function resize() {
    graphics.resize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", resize);
resize();

document.getElementById("load").addEventListener("click", () => {
    const file = document.getElementById("file").files[0];
    if (file) {
        readCSV(file, (data) => {
            types = undefined;
            names = data.names;
            [X, y] = cleanData(data.X, data.y);
        });
    }
});

function train(testSize) {
    [XTest, XTrain, yTest, yTrain] = trainTestSplit(X, y, testSize);

    if (XTest.length > 100000) {
        tree = new DecisionTree(XTrain, yTrain, types, undefined, undefined, Math.log10);
    } else if (XTest.length > 5000) {
        tree = new DecisionTree(XTrain, yTrain, types, undefined, undefined, Math.sqrt);
    } else {
        tree = new DecisionTree(XTrain, yTrain, types);
    }

    graphics.reset();
    displayTree(graphics, tree, names);
}
document.getElementById("train").addEventListener("click", () => {
    train(Number(document.getElementById("test-size").value) || 0.5);
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


X = [
    [0, 0, 0],
    [0, 0, 1],
    [0, 1, 0],
    [0, 1, 1],
    [1, 0, 0],
    [1, 0, 1],
    [1, 1, 0],
    [1, 1, 1]
];
y = [0, 1, 1, 0, 1, 0, 0, 1];
names = ["Input A", "Input B", "Input C"];
types = [DecisionTree.TYPES.UNORDERED, DecisionTree.TYPES.UNORDERED, DecisionTree.TYPES.UNORDERED];
train(1);
graphics.addText(0, 15000, "drag to move\nscroll/pinch to zoom\nupload data to create your own tree", { size: 2500 });
graphics.addText(4e6 * Math.random() - 2e6, 4e6 * Math.random() - 2e6, "hi i", { size: 10000, weight: 700 });