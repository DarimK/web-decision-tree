class Graphics {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.figures = {};
        this.camera = { x: 0, y: 0 };
        this.nextId = 0;
    }

    setCamera(x, y) {
        this.camera.x = x;
        this.camera.y = y;
    }

    #add(data) {
        this.figures[this.nextId++] = data;
    }

    remove(id) {
        delete this.figures[id];
    }

    reset() {
        this.figures = {};
        this.nextId = 0;
        this.setCamera(0, 0);
    }

    addRectangle(x, y, width, height, color = "black") {
        this.#add({ type: "rect", x, y, width, height, color });
    }

    addCircle(x, y, radius, color = "black") {
        this.#add({ type: "circle", x, y, radius, color });
    }

    addLine(x1, y1, x2, y2, color = "black") {
        this.#add({ type: "line", x1, y1, x2, y2, color });
    }

    update() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (const id in this.figures) {
            const figure = this.figures[id];
            this.ctx.fillStyle = figure.color;
            this.ctx.strokeStyle = figure.color;

            if (figure.type === "rect") {
                this.ctx.fillRect(figure.x - this.camera.x, figure.y - this.camera.y, figure.width, figure.height);
            } else if (figure.type === "circle") {
                this.ctx.beginPath();
                this.ctx.arc(figure.x - this.camera.x, figure.y - this.camera.y, figure.radius, 0, Math.PI * 2);
                this.ctx.fill();
            } else if (figure.type === "line") {
                this.ctx.beginPath();
                this.ctx.moveTo(figure.x1 - this.camera.x, figure.y1 - this.camera.y);
                this.ctx.lineTo(figure.x2 - this.camera.x, figure.y2 - this.camera.y);
                this.ctx.stroke();
            }
        }
    }
}