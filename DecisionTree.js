class DecisionTreeNode {
    constructor(condition, leftChild = undefined, rightChild = undefined, label = undefined) {
        this.condition = condition;
        this.leftChild = leftChild;
        this.rightChild = rightChild;
        this.label = label;
    }

    evaluate(instance, types) {
        if (this.label !== undefined) {
            return this.label;
        }
        if ((types[this.condition.attribute] === DecisionTree.TYPES.ORDERED && instance[this.condition.attribute] <= this.condition.value)
            || instance[this.condition.attribute] === this.condition.value) {
            return this.leftChild.evaluate(instance, types);
        }
        return this.rightChild.evaluate(instance, types);
    }

    nodeCount() {
        return this.label !== undefined ? 1 : this.leftChild.nodeCount() + this.rightChild.nodeCount() + 1;
    }

    leafCount() {
        return this.label !== undefined ? 1 : this.leftChild.leafCount() + this.rightChild.leafCount();
    }

    depth() {
        return this.label !== undefined ? 1 : Math.max(this.leftChild.depth(), this.rightChild.depth()) + 1;
    }
}

function sum(nums) {
    let acc = 0;
    for (const n of nums) {
        acc += n;
    }
    return acc;
}

function entropy(freq) {
    let acc = 0;
    let total = sum(freq);
    for (const f of freq) {
        acc -= f === 0 ? 0 : f / total * Math.log2(f / total);
    }
    return acc;
}

function infoGain(parentFreq, childrenFreq) {
    let acc = entropy(parentFreq);
    let total = sum(parentFreq);
    for (const freq of childrenFreq) {
        acc -= sum(freq) / total * entropy(freq);
    }
    return acc;
}

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

function splitOptions(X, sampleSizeMethod) {
    const sampleSize = Math.ceil(sampleSizeMethod(X.length));
    const attrOptions = [];
    const idxArr = [];
    for (let i = 0; i < X.length; i++) {
        idxArr[i] = i;
    }
    shuffle(idxArr);
    for (let attrIdx = 0; attrIdx < X[0].length; attrIdx++) {
        attrOptions.push(new Set());
        for (let i = 0; i < sampleSize; i++) {
            attrOptions[attrIdx].add(X[idxArr[i]][attrIdx]);
        }
    }
    return attrOptions;
}

function splitConditions(attrOptions) {
    const attrConditions = [];
    for (let attrIdx = 0; attrIdx < attrOptions.length; attrIdx++) {
        const splits = Array.from(attrOptions[attrIdx]).sort();
        for (let valIdx = 0; valIdx < splits.length - 1; valIdx++) {
            attrConditions.push({
                attribute: attrIdx,
                value: splits[valIdx]
            });
        }
    }
    return attrConditions;
}

function splitOnCondition(X, y, type, condition, dontSplitX = false) {
    const split1 = { X: [], y: [] };
    const split2 = { X: [], y: [] };
    if (dontSplitX && type === DecisionTree.TYPES.ORDERED) {
        for (let instIdx = 0; instIdx < X.length; instIdx++) {
            if (X[instIdx][condition.attribute] <= condition.value) {
                split1.y.push(y[instIdx]);
            } else {
                split2.y.push(y[instIdx]);
            }
        }
    } else if (dontSplitX) {
        for (let instIdx = 0; instIdx < X.length; instIdx++) {
            if (X[instIdx][condition.attribute] === condition.value) {
                split1.y.push(y[instIdx]);
            } else {
                split2.y.push(y[instIdx]);
            }
        }
    } else if (type === DecisionTree.TYPES.ORDERED) {
        for (let instIdx = 0; instIdx < X.length; instIdx++) {
            if (X[instIdx][condition.attribute] <= condition.value) {
                split1.X.push(X[instIdx]);
                split1.y.push(y[instIdx]);
            } else {
                split2.X.push(X[instIdx]);
                split2.y.push(y[instIdx]);
            }
        }
    } else {
        for (let instIdx = 0; instIdx < X.length; instIdx++) {
            if (X[instIdx][condition.attribute] === condition.value) {
                split1.X.push(X[instIdx]);
                split1.y.push(y[instIdx]);
            } else {
                split2.X.push(X[instIdx]);
                split2.y.push(y[instIdx]);
            }
        }
    }
    return [split1, split2];
}

function countLabels(y, labels) {
    const counts = [];
    for (let i = 0; i < labels.size; i++) {
        counts[i] = 0;
    }
    for (const label of y) {
        counts[label]++;
    }
    return counts;
}

function bestSplitCondition(X, y, types, labels, sampleSizeMethod) {
    const options = splitOptions(X, sampleSizeMethod);
    const conditions = splitConditions(options);
    const parentFreq = countLabels(y, labels);
    let bestCondition = undefined;
    let bestGain = 0;
    for (let condIdx = 0; condIdx < conditions.length; condIdx++) {
        const [split1, split2] = splitOnCondition(X, y, types[conditions[condIdx].attribute], conditions[condIdx], true);
        const split1Freq = countLabels(split1.y, labels);
        const split2Freq = countLabels(split2.y, labels);
        const splitGain = infoGain(parentFreq, [split1Freq, split2Freq]);
        if (splitGain > bestGain) {
            bestCondition = conditions[condIdx];
            bestGain = splitGain;
        }
    }
    return bestCondition;
}

function maxIdx(nums) {
    let m = 0;
    for (let i = 0; i < nums.length; i++) {
        m = nums[i] > nums[m] ? i : m;
    }
    return m;
}

function hunts(X, y, types, labels, maxDepth = Infinity, minInstPerSplit = 2, sampleSizeMethod = (n) => n, depth = 0) {
    if ((new Set(y)).size === 1) {
        return new DecisionTreeNode(undefined, undefined, undefined, labels.get(y[0]));
    }
    if (depth >= maxDepth || y.length < minInstPerSplit) {
        return new DecisionTreeNode(undefined, undefined, undefined, labels.get(maxIdx(countLabels(y, labels))));
    }
    const bestCondition = bestSplitCondition(X, y, types, labels, sampleSizeMethod);
    if (!bestCondition) {
        return new DecisionTreeNode(undefined, undefined, undefined, labels.get(maxIdx(countLabels(y, labels))));
    }
    const [split1, split2] = splitOnCondition(X, y, types[bestCondition.attribute], bestCondition);
    return new DecisionTreeNode(
        bestCondition,
        hunts(split1.X, split1.y, types, labels, maxDepth, minInstPerSplit, sampleSizeMethod, depth + 1),
        hunts(split2.X, split2.y, types, labels, maxDepth, minInstPerSplit, sampleSizeMethod, depth + 1)
    );
}

class DecisionTree {
    static TYPES = { ORDERED: "o", UNORDERED: "u" };

    constructor(X = undefined, y = undefined, types = undefined, maxDepth = Infinity, minInstPerSplit = 2, sampleSizeMethod = (n) => n) {
        this.root = undefined;
        this.types = types;
        if (X && y) {
            this.fit(X, y, types, maxDepth, minInstPerSplit, sampleSizeMethod);
        }
    }

    fit(X, y, types = undefined, maxDepth = Infinity, minInstPerSplit = 2, sampleSizeMethod = (n) => n) {
        if (types !== undefined) {
            this.types = types;
        } else if (this.types === undefined) {
            this.types = [];
            for (const value of X[0]) {
                this.types.push(typeof value === "number" ? DecisionTree.TYPES.ORDERED : DecisionTree.TYPES.UNORDERED);
            }
        }
        const labels = new Map();
        const labelsInverted = new Map();
        let i = 0;
        for (const label of (new Set(y))) {
            labels.set(i, label);
            labelsInverted.set(label, i);
            i++;
        }
        const yTransformed = y.map((label) => labelsInverted.get(label));
        this.root = hunts(X, yTransformed, this.types, labels, maxDepth, minInstPerSplit, sampleSizeMethod);
    }

    evaluate(data) {
        if (typeof data[0] === "object") {
            return data.map((instance) => this.root.evaluate(instance, this.types));
        }
        return this.root.evaluate(data, this.types);
    }

    nodeCount() {
        return this.root.nodeCount();
    }

    leafCount() {
        return this.root.leafCount();
    }

    depth() {
        return this.root.depth();
    }
}