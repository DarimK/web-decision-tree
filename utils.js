class MethodTracker {
    constructor() {
        this.info = Object.create(null);
        this.originals = Object.create(null);
    }

    #getObjectName(object) {
        return object ?
            object.name || object.toString() : undefined;
    }

    track(object, methodNames) {
        if (methodNames === undefined) {
            methodNames = [];
            for (const name of Object.getOwnPropertyNames(object)) {
                if (typeof object[name] === "function") {
                    methodNames.push(name);
                }
            }
        }
        const objectName = this.#getObjectName(object);
        this.info[objectName] = Object.create(null);
        this.originals[objectName] = Object.create(null);
        for (const name of methodNames) {
            this.originals[objectName][name] = object[name];
            this.info[objectName][name] = Object.create(null);
            this.info[objectName][name].time = 0;
            this.info[objectName][name].calls = 0;
            object[name] = (...args) => {
                this.info[objectName][name].calls++;
                let start;
                if (!this.info[objectName][name].start) {
                    this.info[objectName][name].start = true;
                    start = Date.now();
                }
                const returnValue = this.originals[objectName][name].apply(object, args);
                if (start) {
                    this.info[objectName][name].time += Date.now() - start;
                    delete this.info[objectName][name].start;
                }
                return returnValue;
            };
        }
    }

    untrack(object) {
        const objectName = this.#getObjectName(object);
        for (const name in this.info[objectName]) {
            object[name] = this.originals[objectName][name];
        }
        delete this.info[objectName];
        delete this.originals[objectName];
    }

    clear(object) {
        const objectName = this.#getObjectName(object);
        for (const name in this.info[objectName]) {
            this.info[objectName][name].time = 0;
            this.info[objectName][name].calls = 0;
        }
    }

    getInfo(object, methodName) {
        const objectName = this.#getObjectName(object);
        return methodName ?
            this.info[objectName][methodName] : objectName ?
                this.info[objectName] : this.info;
    }
}


function readCSV(file, callback) {
    const reader = new FileReader();
    reader.onload = (event) => {
        const text = event.target.result;
        const data = text.split('\n').map((row) => row.replace('\r', '').split(','));
        callback({
            names: data[0],
            X: data.slice(1).map((row) => row.slice(0, -1)),
            y: data.slice(1).map((row) => row.slice(-1)[0])
        });
    };
    reader.readAsText(file);
}

function cleanData(X, y) {
    X = X.map((row) => row.map((val) => isNaN(Number(val)) ? val : Number(val)));
    y = y.map((val) => isNaN(Number(val)) ? val : Number(val));
    return [X, y];
}

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

function trainTestSplit(X, y, testSize = 0.2, random = true) {
    const idxs = [];
    for (let i = 0; i < X.length; i++) {
        idxs.push(i);
    }
    if (random) {
        shuffle(idxs);
    }

    const XTest = [], yTest = [];
    for (let i = 0; i < Math.floor(X.length * testSize); i++) {
        XTest.push(X[idxs[i]]);
        yTest.push(y[idxs[i]]);
    }

    const XTrain = [], yTrain = [];
    for (let i = Math.floor(X.length * testSize); i < X.length; i++) {
        XTrain.push(X[idxs[i]]);
        yTrain.push(y[idxs[i]]);
    }

    return [XTrain, XTest, yTrain, yTest];
}

function accuracy(predictions, y) {
    let matches = 0;
    for (let i = 0; i < y.length; i++) {
        matches += predictions[i] === y[i] ? 1 : 0;
    }
    return matches / y.length;
}

function addNode(graphics, type, x, y, size, text, padding, color) {
    const figId = graphics.addText(x, y, text, { size }, size * 8, undefined, 99);
    const fig = graphics.figures[figId];
    if (type === "rect") {
        return graphics.addRectangle(
            fig.x,
            fig.y + fig.height / 2,
            fig.width * 1.05 + fig.width * padding,
            fig.height + fig.width * 0.05 + fig.height * padding,
            fig.width * 0.025,
            color,
            undefined,
            fig.zIndex - 1
        );
    } else if (type === "circle") {
        const radius = Math.sqrt((fig.width / 2) ** 2 + (fig.height / 2) ** 2);
        return graphics.addCircle(
            fig.x,
            fig.y + fig.height / 2,
            radius * 1.05 + radius * padding,
            radius * 0.05,
            color,
            undefined,
            fig.zIndex - 1
        );
    }
    return figId;
}

function addLine(graphics, fromId, toId, width, color) {
    const fromFig = graphics.figures[fromId];
    const toFig = graphics.figures[toId];
    graphics.addLine(fromFig.x, fromFig.y, toFig.x, toFig.y, width, color, toFig.zIndex - 2);
}

function displayTree(graphics, tree, names) {
    function displayTreeH(node, x, y, size) {
        let id;
        if (node.label === undefined) {
            id = addNode(graphics, "rect", x, y, size, `${names[node.condition.attribute]} ${tree.types[node.condition.attribute] === DecisionTree.TYPES.ORDERED ? "<=" : "=="} ${node.condition.value}`, 0.2, "#af6f2f");
            addLine(graphics, id, displayTreeH(node.leftChild, x - size * 6 - size * Math.random() * 2, y - size * 6 - size * Math.random() * 8, size / 2), size / 2, "#7f4f1f");
            addLine(graphics, id, displayTreeH(node.rightChild, x + size * 6 + size * Math.random() * 2, y - size * 6 - size * Math.random() * 8, size / 2), size / 2, "#7f4f1f");
        } else {
            id = addNode(graphics, "circle", x, y, size * 2, `${node.label}`, 0.1, "#2faf0f");
        }
        return id;
    }
    
    displayTreeH(tree.root, 0, 0, 5000);
    graphics.addText(-15000, -6000, "true", { size: 2500 });
    graphics.addText(15000, -6000, "false", { size: 2500 });
}