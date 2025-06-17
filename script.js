let tree, X, y, XTest, XTrain, yTest, yTrain;

document.getElementById("load").addEventListener("click", () => {
    const file = document.getElementById("file").files[0];
    if (file) {
        readCSV(file, (data) => {
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
});

document.getElementById("test").addEventListener("click", () => {
    document.getElementById("accuracy").textContent = `Accuracy ${accuracy(tree.evaluate(XTest), yTest)}`;
});

document.getElementById("classify").addEventListener("click", () => {
    const instance = document.getElementById("instance").value.split(",").map((val) => Number(val) ? Number(val) : val);
    const classification = tree.evaluate(instance);
    document.getElementById("classification").textContent = `Classification: ${classification}`;
});


//testing
let isDragging = false;
let lastX = 0, lastY = 0;
let cameraX = 0, cameraY = 0;
let zoom = 1;
const canvas = document.createElement("canvas");
canvas.width = 1000;
canvas.height = 600;
document.body.appendChild(canvas);
const graphics = new Graphics(canvas);
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
document.addEventListener("keypress", (e) => {
    if (e.key === "1") zoom *= 0.98;
    else if (e.key === "2") zoom *= 1.02;
});
canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    zoom *= event.deltaY < 0 ? 1.1 : 0.9;
});
animate()

let initialPinchDistance = 1;
let initialZoom = 1;
const div = document.createElement("div");
div.textContent = "3";
document.body.appendChild(div);
function showError(callback) {
    try {
        callback();
    } catch (e) {
        div.textContent = e.message;
    }
}
canvas.addEventListener("touchstart", (event) => {
    showError(() => {
        if (event.touches.length >= 1) {
            isDragging = true;
            if (event.touches.length === 2) {
                const xDistance = event.touches[0].clientX - event.touches[1].clientX;
                const yDistance = event.touches[0].clientY - event.touches[1].clientY;
                div.textContent = `${xDistance} ${yDistance}`;
                initialPinchDistance = Math.sqrt(xDistance ** 2 + yDistance ** 2);
                initialZoom = zoom;
                lastX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
                lastY = (event.touches[0].clientY + event.touches[1].clientY) / 2;
            } else {
                lastX = event.touches[0].clientX;
                lastY = event.touches[0].clientY;
            }
        }
    });
    event.preventDefault();
}, { passive: false });
canvas.addEventListener("touchend", (event) => {
    if (event.touches.length === 0) {
        isDragging = false;
    }
});
canvas.addEventListener("touchmove", (event) => {
    showError(() => {
        if (event.touches.length >= 1) {
            let currentX = event.touches[0].clientX;
            let currentY = event.touches[0].clientY;
            if (event.touches.length === 2) {
                const xDistance = event.touches[0].clientX - event.touches[1].clientX;
                const yDistance = event.touches[0].clientY - event.touches[1].clientY;
                div.textContent = `${xDistance} ${yDistance}`;
                const distance = Math.sqrt(xDistance ** 2 + yDistance ** 2);
                zoom = initialZoom * (distance / initialPinchDistance);
                currentX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
                currentY = (event.touches[0].clientY + event.touches[1].clientY) / 2;
            }
            if (isDragging) {
                const dx = currentX - lastX;
                const dy = currentY - lastY;
                cameraX -= dx / zoom;
                cameraY -= dy / zoom;
                lastX = currentX;
                lastY = currentY;
            }
        }
    });
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
        `700 ${Math.floor(Math.random() * 15) + 5}px sans-serif`,
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