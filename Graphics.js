class Graphics {
    static MAX_Z_INDEX = 99;

    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.reset();
    }

    setCamera(x, y, zoom) {
        this.stateChanged = true;
        this.camera.x = x;
        this.camera.y = y;
        this.camera.zoom = zoom ?? this.camera.zoom;
        this.camera.bounds = {
            xL: this.camera.x - this.canvas.width / this.camera.zoom / 2,
            xR: this.camera.x + this.canvas.width / this.camera.zoom / 2,
            yL: this.camera.y - this.canvas.height / this.camera.zoom / 2,
            yR: this.camera.y + this.canvas.height / this.camera.zoom / 2,
        };
    }

    reset() {
        this.figures = {};
        this.zIndexLayers = [];
        this.camera = {};
        this.setCamera(0, 0, 1);
        this.nextId = 0;
        this.stateChanged = false;
    }

    #add(data) {
        this.stateChanged = true;
        this.figures[this.nextId] = data;
        data.zIndex = data.zIndex > Graphics.MAX_Z_INDEX ? Graphics.MAX_Z_INDEX : data.zIndex;
        if (this.zIndexLayers[data.zIndex]) {
            this.zIndexLayers[data.zIndex].push(this.nextId);
        } else {
            this.zIndexLayers[data.zIndex] = [this.nextId];
        }
        return this.nextId++;
    }

    remove(id) {
        this.stateChanged = true;
        const zIndex = this.figures[id].zIndex;
        this.zIndexLayers[zIndex].splice(this.zIndexLayers[zIndex].indexOf(id), 1);
        if (this.zIndexLayers[zIndex].length === 0) {
            delete this.zIndexLayers[zIndex];
        }
        delete this.figures[id];
    }

    #getTextRows(text, maxWidth) {
        const words = text.split(" ");
        const rows = [];
        let newRow = words[0];

        for (let i = 1; i < words.length; i++) {
            if (this.ctx.measureText(newRow + " " + words[i]).width < maxWidth) {
                newRow += " " + words[i];
            } else {
                rows.push(newRow);
                newRow = words[i];
            }
        }

        rows.push(newRow);
        return rows;
    }

    addRectangle(x, y, width, height, borderWidth = 0, color = "black", borderColor = "black", zIndex = 0) {
        return this.#add({ type: "rect", x, y, width, height, borderWidth, color, borderColor, zIndex });
    }

    addCircle(x, y, radius, borderWidth = 0, color = "black", borderColor = "black", zIndex = 0) {
        return this.#add({ type: "circle", x, y, radius, borderWidth, color, borderColor, zIndex });
    }

    addLine(x1, y1, x2, y2, width, color = "black", zIndex = 0) {
        return this.#add({ type: "line", x1, y1, x2, y2, width, color, zIndex });
    }

    addText(x, y, text, font = "16px sans-serif", maxWidth, color = "black", zIndex = 0) {
        this.ctx.font = font;
        const metrics = this.ctx.measureText(text);
        return this.#add({
            type: "text", x, y, font, color, zIndex,
            textRows: this.#getTextRows(text, maxWidth),
            height: metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
        });
    }

    //remove all math to boost performance on frequent updates
    update() {
        if (this.stateChanged) this.stateChanged = false;
        else return;

        const { ctx, camera } = this;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.save();
        ctx.translate(-camera.x * camera.zoom + this.canvas.width / 2, -camera.y * camera.zoom + this.canvas.height / 2);
        ctx.scale(camera.zoom, camera.zoom);
        //for now
        ctx.textAlign = "center";
        ctx.textBaseline = "top";

        for (const layer of this.zIndexLayers) {
            if (layer === undefined) continue;

            for (const id of layer) {
                const figure = this.figures[id];
                if (figure.x < camera.bounds.xL || figure.x > camera.bounds.xR
                    || figure.y < camera.bounds.yL || figure.y > camera.bounds.yR) continue;
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
                } else if (figure.type === "text") {
                    ctx.font = figure.font;
                    let y = figure.y;
                    for (const row of figure.textRows) {
                        ctx.fillText(row, figure.x, y);
                        y += figure.height;
                    }
                }
            }
        }

        ctx.restore();
    }
}