import { AppState } from "./AppState.js";
import { Telemetry } from "./Ui2d.js";

AppState.init();

animate();

function animate() {
    requestAnimationFrame(animate);
    Telemetry.updateStats();
    AppState.Render();
}
