const HIGHLIGHT_MATERIAL_V2 = new THREE.ShaderMaterial({
    uniforms: {
        colorTop: { value: new THREE.Color(0xAAAAAA) },   // light gray
        colorBottom: { value: new THREE.Color(0x444444) } // dark gray
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform vec3 colorTop;
        uniform vec3 colorBottom;
        varying vec2 vUv;
        void main() {
            vec3 color = mix(colorBottom, colorTop, vUv.y);
            gl_FragColor = vec4(color, 0.5); // 50% opacity
        }
    `,
    transparent: true
});