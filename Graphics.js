class Graphics {
    static MAX_Z_INDEX = 99;
    #caching = true;

    constructor(canvas, caching = true) {
        this.canvas = canvas;
        this.#caching = caching;
        this.ctx = canvas.getContext("2d");
        if (caching) {
            this.cache = { canvas: document.createElement("canvas") };
            this.cache.ctx = this.cache.canvas.getContext("2d");
            this.resize(canvas.width, canvas.height);
        }
        this.reset();
    }

    reset() {
        this.figures = {};
        this.zIndexLayers = [];
        this.camera = {};
        if (this.#caching) this.cache.camera = {};
        this.setCamera(0, 0, 1);
        if (this.#caching) this.#updateCacheData();
        this.nextId = 0;
        this.frame = 0;
    }

    resize(width, height) {
        this.canvas.width = width ?? this.canvas.width;
        this.canvas.height = height ?? this.canvas.height;
        this.cache.canvas.width = this.canvas.width * 4;
        this.cache.canvas.height = this.canvas.height * 4;
    }

    #updateCacheData() {
        const { camera, cache } = this;
        cache.width = cache.canvas.width / camera.zoom;
        cache.height = cache.canvas.height / camera.zoom;
        cache.bounds = {
            xL: camera.x - cache.width / 2,
            xU: camera.x + cache.width / 2,
            yL: camera.y - cache.height / 2,
            yU: camera.y + cache.height / 2,
        };
    }

    #setCamera(canvas, camera, x, y, zoom) {
        camera.x = x;
        camera.y = y;
        camera.zoom = zoom ?? camera.zoom;
        camera.bounds = {
            xL: camera.x - canvas.width / camera.zoom / 2,
            xU: camera.x + canvas.width / camera.zoom / 2,
            yL: camera.y - canvas.height / camera.zoom / 2,
            yU: camera.y + canvas.height / camera.zoom / 2,
        };
    }

    setCamera(x, y, zoom) {
        if (!this.stateChanged && (x !== this.camera.x || y !== this.camera.y || zoom !== this.camera.zoom)) {
            this.stateChanged = "camera";
        }
        this.#setCamera(this.canvas, this.camera, x, y, zoom);
        if (this.#caching) {
            this.#setCamera(this.cache.canvas, this.cache.camera, x, y, zoom);
        }
    }

    #add(data) {
        this.stateChanged = "figure";
        this.figures[this.nextId] = data;
        data.zIndex = data.zIndex > Graphics.MAX_Z_INDEX ?
            Graphics.MAX_Z_INDEX : data.zIndex < 0 ?
                0 : data.zIndex;
        if (this.zIndexLayers[data.zIndex]) {
            this.zIndexLayers[data.zIndex].push(this.nextId);
        } else {
            this.zIndexLayers[data.zIndex] = [this.nextId];
        }
        return this.nextId++;
    }

    #remove(id) {
        if (!this.figures[id]) return;
        this.stateChanged = "figure";
        const zIndex = this.figures[id].zIndex;
        this.zIndexLayers[zIndex].splice(this.zIndexLayers[zIndex].indexOf(id), 1);
        if (this.zIndexLayers[zIndex].length === 0) {
            delete this.zIndexLayers[zIndex];
        }
        delete this.figures[id];
    }

    remove(id) {
        if (this.figures[id] && this.figures[id].ids) {
            for (const subId of this.figures[id].ids) {
                this.#remove(subId);
            }
        }
        this.#remove(id);
    }

    #getTextRows(text, maxWidth) {
        const rows = [];

        for (const sentence of text.split("\n")) {
            const words = sentence.split(" ");
            let newText = words[0];
            let newMetrics = this.ctx.measureText(newText);

            for (let i = 1; i < words.length; i++) {
                const testText = newText + " " + words[i];
                const testMetrics = this.ctx.measureText(testText);
                if (testMetrics.width < maxWidth) {
                    newText = testText;
                    newMetrics = testMetrics;
                } else {
                    rows.push({ text: newText, metrics: newMetrics });
                    newText = words[i];
                    newMetrics = this.ctx.measureText(newText);
                }
            }

            rows.push({ text: newText, metrics: newMetrics });
        }

        return rows;
    }

    addRectangle(x, y, width, height, borderWidth = 0, color = "black", borderColor = "black", zIndex = 0) {
        return this.#add({
            type: "rect", x, y, width, height, borderWidth, color, borderColor, zIndex,
            bounds: { xL: x - width / 2, xU: x + width / 2, yL: y - height / 2, yU: y + height / 2 }
        });
    }

    addCircle(x, y, radius, borderWidth = 0, color = "black", borderColor = "black", zIndex = 0) {
        return this.#add({
            type: "circle", x, y, radius, borderWidth, color, borderColor, zIndex,
            bounds: { xL: x - radius, xU: x + radius, yL: y - radius, yU: y + radius }
        });
    }

    addLine(x1, y1, x2, y2, width, color = "black", zIndex = 0) {
        return this.#add({
            type: "line", x1, y1, x2, y2, width, color, zIndex,
            bounds: {
                xL: Math.min(x1, x2) - width / 2,
                xU: Math.max(x1, x2) + width / 2,
                yL: Math.min(y1, y2) - width / 2,
                yU: Math.max(y1, y2) + width / 2
            }
        });
    }

    addText(x, y, text, font = "16px sans-serif", maxWidth = Infinity, color = "black", zIndex = 0, lineHeight = 1, textAlign = "center") {
        this.ctx.font = font;
        this.ctx.textAlign = textAlign;
        const metrics = this.ctx.measureText("");
        const height = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;
        const rows = this.#getTextRows(text, maxWidth);
        const ids = [];
        let rowY = y;
        let largestWidth = 0;

        for (const row of rows) {
            const xL = x - row.metrics.actualBoundingBoxLeft;
            const xU = x + row.metrics.actualBoundingBoxRight;
            ids.push(this.#add({
                type: "textRow", x, font, color, zIndex, textAlign,
                y: rowY,
                text: row.text,
                bounds: { xL, xU, yL: rowY, yU: rowY + height }
            }));

            rowY += height * lineHeight;
            if (xU - xL > largestWidth) largestWidth = xU - xL;
        }

        const lastRowHeight = rows[rows.length - 1].metrics.actualBoundingBoxDescent -
            rows[rows.length - 1].metrics.actualBoundingBoxAscent;
        return this.#add({
            type: "text", ids, x, y, color, zIndex,
            width: largestWidth,
            height: rowY - y - height * lineHeight + lastRowHeight
        });
    }

    #resetCanvas(graphics) {
        const { canvas, ctx, camera } = graphics;
        ctx.restore();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(-camera.x * camera.zoom + canvas.width / 2, -camera.y * camera.zoom + canvas.height / 2);
        ctx.scale(camera.zoom, camera.zoom);
        ctx.textBaseline = "top";
    }

    //remove all math to boost performance on frequent updates (maybe later)
    #batchUpdate(ctx, camera, frame, maxBatchTime, callback, layerIdx = 0, idIdx = 0) {
        if (layerIdx >= this.zIndexLayers.length || frame !== this.frame) {
            if (callback) callback();
            return;
        }

        let start = Date.now();
        while (layerIdx < this.zIndexLayers.length && Date.now() - start < maxBatchTime) {
            if (this.zIndexLayers[layerIdx] === undefined) {
                layerIdx++;
                continue;
            }

            const figure = this.figures[this.zIndexLayers[layerIdx][idIdx]];
            if (figure.bounds &&
                figure.bounds.xL <= camera.bounds.xU && figure.bounds.xU >= camera.bounds.xL &&
                figure.bounds.yL <= camera.bounds.yU && figure.bounds.yU >= camera.bounds.yL &&
                (figure.bounds.xU - figure.bounds.xL) / (camera.bounds.xU - camera.bounds.xL) > 1e-5 &&
                (figure.bounds.yU - figure.bounds.yL) / (camera.bounds.yU - camera.bounds.yL) > 1e-5) {
                ctx.fillStyle = figure.color;
                ctx.strokeStyle = figure.borderColor ?? figure.color;

                if (figure.type === "rect") {
                    ctx.fillRect(figure.x - figure.width / 2, figure.y - figure.height / 2, figure.width, figure.height);

                    if (figure.borderWidth > 0) {
                        const bw = figure.borderWidth;
                        const halfBW = bw / 2;
                        ctx.lineWidth = figure.borderWidth;
                        ctx.strokeRect(
                            figure.x + halfBW - figure.width / 2,
                            figure.y + halfBW - figure.height / 2,
                            figure.width - bw,
                            figure.height - bw
                        );
                    }
                } else if (figure.type === "circle") {
                    ctx.beginPath();
                    ctx.arc(figure.x, figure.y, figure.radius, 0, Math.PI * 2);
                    ctx.fill();

                    if (figure.borderWidth > 0) {
                        ctx.lineWidth = figure.borderWidth;
                        ctx.beginPath();
                        ctx.arc(figure.x, figure.y, figure.radius - figure.borderWidth / 2, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                } else if (figure.type === "line") {
                    ctx.lineWidth = figure.width;
                    ctx.beginPath();
                    ctx.moveTo(figure.x1, figure.y1);
                    ctx.lineTo(figure.x2, figure.y2);
                    ctx.stroke();
                } else if (figure.type === "textRow") {
                    ctx.font = figure.font;
                    ctx.textAlign = figure.textAlign;
                    ctx.fillText(figure.text, figure.x, figure.y);
                }
            }

            idIdx++;
            if (idIdx >= this.zIndexLayers[layerIdx].length) {
                idIdx = 0;
                layerIdx++;
            }
        }

        setTimeout(() => {
            this.#batchUpdate(ctx, camera, frame, maxBatchTime, callback, layerIdx, idIdx);
        }, 0);
    }

    update() {
        if (!(this.stateChanged || this.#caching && this.cache.updating)) return;
        this.#resetCanvas(this);

        if (this.#caching) {
            const { ctx, camera, cache } = this;
            const outOfBounds = camera.bounds.xL < cache.bounds.xL || camera.bounds.xU > cache.bounds.xU ||
                camera.bounds.yL < cache.bounds.yL || camera.bounds.yU > cache.bounds.yU;
            const zoomTooHigh = cache.width / Math.abs(camera.bounds.xU - camera.bounds.xL) > 8;

            if (!cache.updating && (this.stateChanged === "figure" || outOfBounds || zoomTooHigh)) {
                cache.updating = true;
                this.#resetCanvas(cache);
                this.#batchUpdate(cache.ctx, cache.camera, ++this.frame, 5, () => {
                    cache.updating = false;
                    this.stateChanged = "cache";
                });
                this.#updateCacheData();
            }

            ctx.drawImage(cache.canvas, cache.bounds.xL, cache.bounds.yL, cache.width, cache.height);
        } else {
            this.#batchUpdate(this.ctx, this.camera, ++this.frame, 5);
        }

        delete this.stateChanged;
    }
}