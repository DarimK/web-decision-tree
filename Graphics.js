class Graphics {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.figures = {};
        this.camera = { x: 0, y: 0, zoom: 1 };
        this.nextId = 0;
    }

    setCamera(x, y, zoom) {
        this.camera.x = x;
        this.camera.y = y;
        this.camera.zoom = zoom ?? this.camera.zoom;
    }

    #add(data) {
        this.figures[this.nextId] = data;
        return this.nextId++;
    }

    remove(id) {
        delete this.figures[id];
    }

    reset() {
        this.figures = {};
        this.nextId = 0;
        this.setCamera(0, 0, 1);
    }

    addRectangle(x, y, width, height, borderWidth = 0, color = "black", borderColor = "black") {
        return this.#add({ type: "rect", x, y, width, height, borderWidth, color, borderColor });
    }

    addCircle(x, y, radius, borderWidth = 0, color = "black", borderColor = "black") {
        return this.#add({ type: "circle", x, y, radius, borderWidth, color, borderColor });
    }

    addLine(x1, y1, x2, y2, width, color = "black") {
        return this.#add({ type: "line", x1, y1, x2, y2, width, color });
    }

    update() {
        const { ctx, camera } = this;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.save();
        ctx.translate(-camera.x * camera.zoom + this.canvas.width / 2, -camera.y * camera.zoom + this.canvas.height / 2);
        ctx.scale(camera.zoom, camera.zoom);

        for (const id in this.figures) {
            const figure = this.figures[id];
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
            }
        }

        ctx.restore();
    }
}