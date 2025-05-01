export class Telemetry {
    static fpsDisplay = document.createElement("div");

    static lastFrameT = performance.now();
    static lastUpdateT = performance.now();
    static frameCount = 0;
    static latency = 0;


    static createTelemetryDisplay() {
        this.fpsDisplay.className = 'telemetry-display';
        this.fpsDisplay.innerText = 'FPS: 0\nLatency: 0ms';
        document.body.appendChild(this.fpsDisplay);
    }


    static updateStats() {
        const now = performance.now();
        this.frameCount++;

        this.latency = now - this.lastFrameT;

        if (now - this.lastUpdateT >= 1000) { // updates per sec
            const fps = this.frameCount;

            this.frameCount = 0;
            this.lastUpdateT = now;

            this.fpsDisplay.innerText = `FPS: ${fps}\nLATENCY: ${this.latency.toFixed(1)} ms`;
        }

        this.lastFrameT = now;
    }
}