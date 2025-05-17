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