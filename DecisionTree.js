class DTNode {
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

    decisionPath(instance, types) {
        if (this.label !== undefined) {
            return `${this.label}`;
        }
        if ((types[this.condition.attribute] === DecisionTree.TYPES.ORDERED && instance[this.condition.attribute] <= this.condition.value)
            || instance[this.condition.attribute] === this.condition.value) {
            return `L-${this.leftChild.decisionPath(instance, types)}`;
        }
        return `R-${this.rightChild.decisionPath(instance, types)}`;
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

    toString() {
        if (this.label !== undefined) {
            return `${this.label}`;
        }
        return `${this.condition.attribute}-${this.condition.value}\n${this.leftChild.toString()}\n${this.rightChild.toString()}`;
    }
}

class DTBuilder {
    //ngl make small change to dt (hunts) to work for dtreg cuz its just average label
    static sum(nums) {
        let acc = 0;
        for (const n of nums) {
            acc += n;
        }
        return acc;
    }

    static entropy(freq) {
        let acc = 0;
        let total = DTBuilder.sum(freq);
        for (const f of freq) {
            acc -= f === 0 ? 0 : f / total * Math.log2(f / total);
        }
        return acc;
    }

    static infoGain(parentFreq, childrenFreq) {
        let acc = DTBuilder.entropy(parentFreq);
        let total = DTBuilder.sum(parentFreq);
        for (const freq of childrenFreq) {
            acc -= DTBuilder.sum(freq) / total * DTBuilder.entropy(freq);
        }
        return acc;
    }

    static shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }

    static splitOptions(X, sampleSizeMethod) {
        const sampleSize = Math.ceil(sampleSizeMethod(X.length));
        const attrOptions = [];
        const idxArr = [];
        for (let i = 0; i < X.length; i++) {
            idxArr[i] = i;
        }
        DTBuilder.shuffle(idxArr);
        for (let attrIdx = 0; attrIdx < X[0].length; attrIdx++) {
            attrOptions.push(new Set());
            for (let i = 0; i < sampleSize; i++) {
                attrOptions[attrIdx].add(X[idxArr[i]][attrIdx]);
            }
        }
        return attrOptions;
    }

    static splitConditions(attrOptions) {
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

    static splitOnCondition(X, y, type, condition) {
        const split1 = { X: [], y: [] };
        const split2 = { X: [], y: [] };
        if (type === DecisionTree.TYPES.ORDERED) {
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

    static countLabels(y, labels) {
        const counts = [];
        for (let i = 0; i < labels.size; i++) {
            counts[i] = 0;
        }
        for (const label of y) {
            counts[label]++;
        }
        return counts;
    }

    static splitAndCount(X, y, type, labels, condition) {
        const counts1 = [];
        const counts2 = [];
        for (let i = 0; i < labels.size; i++) {
            counts1[i] = 0;
            counts2[i] = 0;
        }
        if (type === DecisionTree.TYPES.ORDERED) {
            for (let instIdx = 0; instIdx < X.length; instIdx++) {
                if (X[instIdx][condition.attribute] <= condition.value) {
                    counts1[y[instIdx]]++;
                } else {
                    counts2[y[instIdx]]++;
                }
            }
        } else {
            for (let instIdx = 0; instIdx < X.length; instIdx++) {
                if (X[instIdx][condition.attribute] === condition.value) {
                    counts1[y[instIdx]]++;
                } else {
                    counts2[y[instIdx]]++;
                }
            }
        }
        return [counts1, counts2];
    }

    static bestSplitCondition(X, y, types, labels, sampleSizeMethod) {
        const options = DTBuilder.splitOptions(X, sampleSizeMethod);
        const conditions = DTBuilder.splitConditions(options);
        const parentFreq = DTBuilder.countLabels(y, labels);
        let bestCondition = undefined;
        let bestGain = 0;
        for (let condIdx = 0; condIdx < conditions.length; condIdx++) {
            const childrenFreq = DTBuilder.splitAndCount(X, y, types[conditions[condIdx].attribute], labels, conditions[condIdx]);
            const splitGain = DTBuilder.infoGain(parentFreq, childrenFreq);
            if (splitGain > bestGain) {
                bestCondition = conditions[condIdx];
                bestGain = splitGain;
            }
        }
        return bestCondition;
    }

    static maxIdx(nums) {
        let m = 0;
        for (let i = 0; i < nums.length; i++) {
            m = nums[i] > nums[m] ? i : m;
        }
        return m;
    }

    static hunts(X, y, types, labels, maxDepth = Infinity, minInstPerSplit = 2, sampleSizeMethod = (n) => n, depth = 0) {
        if ((new Set(y)).size === 1) {
            return new DTNode(undefined, undefined, undefined, labels.get(y[0]));
        }
        if (depth >= maxDepth || y.length < minInstPerSplit) {
            return new DTNode(undefined, undefined, undefined, labels.get(DTBuilder.maxIdx(DTBuilder.countLabels(y, labels))));
        }
        const bestCondition = DTBuilder.bestSplitCondition(X, y, types, labels, sampleSizeMethod);
        if (!bestCondition) {
            return new DTNode(undefined, undefined, undefined, labels.get(DTBuilder.maxIdx(DTBuilder.countLabels(y, labels))));
        }
        const [split1, split2] = DTBuilder.splitOnCondition(X, y, types[bestCondition.attribute], bestCondition);
        return new DTNode(
            bestCondition,
            DTBuilder.hunts(split1.X, split1.y, types, labels, maxDepth, minInstPerSplit, sampleSizeMethod, depth + 1),
            DTBuilder.hunts(split2.X, split2.y, types, labels, maxDepth, minInstPerSplit, sampleSizeMethod, depth + 1)
        );
    }

    static parseString(string) {
        const i = string.indexOf("-");
        if (i === -1) {
            return { label: Number(string) || (string === "0" ? 0 : string) };
        }
        const value = string.substring(i + 1);
        return {
            attribute: Number(string.substring(0, i)),
            value: Number(value) || (value === "0" ? 0 : value)
        };
    }

    static fromString(stringNodes) {
        if (stringNodes.length === 1) {
            return new DTNode(undefined, undefined, undefined, DTBuilder.parseString(stringNodes[0]).label);
        }
        const parsed = DTBuilder.parseString(stringNodes.shift());
        if (parsed.label !== undefined) {
            return new DTNode(undefined, undefined, undefined, parsed.label);
        }
        return new DTNode(parsed, DTBuilder.fromString(stringNodes), DTBuilder.fromString(stringNodes));
    }
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
        this.root = DTBuilder.hunts(X, yTransformed, this.types, labels, maxDepth, minInstPerSplit, sampleSizeMethod);
    }

    evaluate(data) {
        if (typeof data[0] === "object") {
            return data.map((instance) => this.root.evaluate(instance, this.types));
        }
        return this.root.evaluate(data, this.types);
    }

    decisionPath(data) {
        if (typeof data[0] === "object") {
            return data.map((instance) => this.root.decisionPath(instance, this.types));
        }
        return this.root.decisionPath(data, this.types);
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

    toString() {
        return `${this.types.toString().replaceAll(",", "")}\n${this.root.toString()}`;
    }

    static fromString(string) {
        const tree = new DecisionTree();
        const stringNodes = string.split("\n");
        tree.types = Array.from(stringNodes.shift());
        tree.root = DTBuilder.fromString(stringNodes);
        return tree;
    }
}