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

function accuracy(predictions, y) {
    let matches = 0;
    for (let i = 0; i < y.length; i++) {
        matches += predictions[i] === y[i] ? 1 : 0;
    }
    return matches / y.length;
}