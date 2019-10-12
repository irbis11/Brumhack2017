var canvas = document.getElementById("renderCanvas"); // Get the canvas element

var engine = new BABYLON.Engine(canvas, true); // Generate the BABYLON 3D engine

var camera;
var spawnAsset;
var loader;
var rocketTemplate = {};
var cannon = {};
var tank = {};

var ws;
function initLeapMotionRemote(ip) {
    // Create and open the socket
    ws = new WebSocket("ws://" + ip + ":7778");

    // On successful connection
    ws.onopen = function(event) {
        console.log("Connected to Leap Motion server");
    };

    // On message received
    ws.onmessage = function(event) {
        var obj = JSON.parse(event.data);
        var str = JSON.stringify(obj, undefined, 2);
        if(!obj.id) {

        } else {
            var data = JSON.parse(str);
            if (data.hands[0] !== undefined) {
                var palmHeight = data.hands[0].palmPosition[1];
                var palmHorizontal = data.hands[0].palmPosition[0];

                // Normalize vertical
                palmHeight -= 100;
                if (palmHeight < 0) {
                    palmHeight = 0;
                } else if (palmHeight > 300) {
                    palmHeight = 300;
                }
                palmHeight = 300 - palmHeight;
                // Normalize horizontal
                if (palmHorizontal < -200) {
                    palmHorizontal = -200;
                } else if (palmHorizontal > 200) {
                    palmHorizontal = 200;
                }
                palmHorizontal += 200;
                palmHorizontal *= 8;
                //console.log("Horizontal: " + palmHorizontal + ", Height:" + palmHeight);
            }
            if (data.gestures.length > 0) {
                var left, right;
                for (var i = 0; i < data.hands.length; i++) {
                    var hand = data.hands[i];
                    if (hand.type == "left") {
                        left = hand.id;
                    } else if (hand.type == "right") {
                        right = hand.id;
                    }
                }
                var leftTrack = "stop";
                var rightTrack = "stop";
                for (var i = 0; i < data.gestures.length; i++) {
                    var gesture = data.gestures[i];
                    var handId = gesture.handIds[0];
                    if (handId == left) {
                        if (gesture.type == "circle") {
                            // normal [-0.941591, 0.325137, 0.0877028]
                            // normal [0.998014, -0.032531, -0.0539415]
                            if (gesture.normal[0] < 0) {
                                leftTrack = "forward";
                            } else {
                                leftTrack = "backward";
                            }
                        }
                    } else if (handId == right) {
                        if (gesture.type == "circle") {
                            if (gesture.normal[0] < 0) {
                                rightTrack = "forward";
                            } else {
                                rightTrack = "backward";
                            }
                        }
                    }
                };

                console.log("Left: " + leftTrack +", Right: " + rightTrack);

                // Move according to gestures
                if (leftTrack == "forward" && rightTrack == "forward") {
                    moveTank(1);
                } else if (leftTrack == "backward" && rightTrack == "backward") {
                    moveTank(-1);
                } else if (leftTrack == "forward") {
                    rotateTank(1);
                } else if (rightTrack == "forward") {
                    rotateTank(-1);
                }
                // if (leftTrack && !rightTrack) {
                //     rotateTank(1);
                // } else if (rightTrack && !leftTrack) {
                //     rotateTank(-1);
                // } else if (leftTrack && rightTrack) {
                //     moveTank(1);
                // }
                //console.log(data);
            }
        }
    };

    // On socket close
    ws.onclose = function(event) {
        ws = null;
        console.log("Leap Motion socket closed");
    };

    // On socket error
    ws.onerror = function(event) {
        console.log("Leap Motion socket error: " + event);
    };
}

/******* Add the create scene function ******/
var createScene = function() {

    function spawnAssetImpl(model, scale, enablePhysics, x, y, z, loadCallback) {
        var meshTask = loader.addMeshTask(model, "", "Assets/", model + ".obj");
        meshTask.onSuccess = function(task) {
            var mesh = task.loadedMeshes[0];
            mesh.position = new BABYLON.Vector3(x, y, z);
            mesh.scaling = new BABYLON.Vector3(scale, scale, scale);
            if (enablePhysics) {
                mesh.physicsImpostor = new BABYLON.PhysicsImpostor(mesh, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 100, restitution: 0.0 }, scene);
            } else {
                mesh.physicsImpostor = new BABYLON.PhysicsImpostor(mesh, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.0 }, scene);
            }
            mesh.checkCollisions = true;
            if (loadCallback != undefined) {
                loadCallback(mesh);
            }
        }
    }
    spawnAsset = spawnAssetImpl;

    // Create the scene space
    var scene = new BABYLON.Scene(engine);

    // Setup gravity / physics
    var gravityVector = new BABYLON.Vector3(0, -9.81, 0);
    scene.collisionsEnabled = true;
    var physicsPlugin = new BABYLON.CannonJSPlugin();
    scene.enablePhysics(gravityVector, physicsPlugin);

    // Setup terrain
    const size = 1000;
    const noiseFreq = 0.05;
    const maxHeight = 1;
    noise.seed(0.5);
    let paths = [];
    for (let x = 0; x < size; x++) {
        let path = []
        for (let z = 0; z < size; z++) {
            const y = noise.perlin2(x * noiseFreq, z * noiseFreq) * maxHeight;
            var offset = size / 2;
            path.push(new BABYLON.Vector3(x - offset, y, z - offset));
        }
        paths.push(path);
    }

    // (name, array of paths, closeArray, closePath, offset, scene)
    const terrain = BABYLON.Mesh.CreateRibbon("ribbon", paths, false, false, 0, scene);
    terrain.position = new BABYLON.Vector3(-25, 0, -25);
    terrain.material = new BABYLON.StandardMaterial("mm", scene);
    terrain.physicsImpostor = new BABYLON.PhysicsImpostor(terrain, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.9, friction: 0.1 }, scene);
    scene.collisionsEnabled = true;

    // var sphere = BABYLON.MeshBuilder.CreateSphere("sphere", {diameter: 1000}, scene);
    // sphere.physicsImpostor = new BABYLON.PhysicsImpostor(sphere, BABYLON.PhysicsImpostor.SphereImpostor, { mass: 0, restitution: 0.0 }, scene);
    // sphere.checkCollisions = true;
    // sphere.position = new BABYLON.Vector3(0, 0, 0);

    //var test = BABYLON.MeshBuilder.CreateSphere("sphere", {diameter: 10}, scene);
    //sphere.physicsImpostor = new BABYLON.PhysicsImpostor(sphere, BABYLON.PhysicsImpostor.SphereImpostor, { mass: 10, restitution: 0.0 }, scene);
    //sphere.checkCollisions = true;
    //sphere.position = new BABYLON.Vector3(0, 1010, 0);

    loader = new BABYLON.AssetsManager(scene);

    // Add a camera to the scene and attach it to the canvas
    camera = new BABYLON.ArcRotateCamera("Camera", Math.PI, Math.PI / 2.5, 2, BABYLON.Vector3.Zero(), scene);
    camera.attachControl(canvas, true);

    var camerasBorderFunction = function () {
        //Angle
        if (camera.beta < 0.1)
            camera.beta = 0.1;
        else if (camera.beta > (Math.PI / 2) * 0.9)
            camera.beta = (Math.PI / 2) * 0.9;

        // Zoom
        if (camera.radius > 300)
            camera.radius = 300;

        if (camera.radius < 30)
            camera.radius = 30;
    };

    //scene.registerBeforeRender(camerasBorderFunction);

    // Add lights to the scene
    var light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(1, 1, 0), scene);
    //var light2 = new BABYLON.PointLight("light2", new BABYLON.Vector3(0, 1, -1), scene);
    light1.intensity = 1.0
    light1.specular = BABYLON.Color3.Black();

    /******* OBJECTS ********/

        spawnAsset("drzewo3", 0.1, false, 100, 0, -200);
        spawnAsset("drzewo6", 0.1, false, 129, 0, -250);
        spawnAsset("drzewo4", 0.1, false, 159, 0, -200);
        spawnAsset("drzewo9", 0.1, false, 229, 0, -250);
        spawnAsset("drzewo2", 0.1, false, 259, 0, -200);
        spawnAsset("drzewo3", 0.1, false, 329, 0, -250);
        spawnAsset("drzewo5", 0.1, false, 359, 0, -200);
        spawnAsset("drzewo7", 0.1, false, 429, 0, -200);
        spawnAsset("drzewo2", 0.1, false, 459, 0, -250);
        spawnAsset("drzewo5", 0.1, false, 529, 0, -200);
//
        spawnAsset("drzewo3", 0.1, false, 35, 0, -150);
        spawnAsset("drzewo6", 0.1, false, 135, 0, -120);
        spawnAsset("drzewo8", 0.1, false, 165, 0, -150);
        spawnAsset("drzewo10", 0.1, false, 235, 0, -120);
        spawnAsset("drzewo4", 0.1, false, 265, 0, -150);
        spawnAsset("drzewo2", 0.1, false, 335, 0, -120);
        spawnAsset("drzewo4", 0.1, false, 365, 0, -120);
        spawnAsset("drzewo7", 0.1, false, 435, 0, -150);
        spawnAsset("drzewo8", 0.1, false, 465, 0, -150);
        spawnAsset("drzewo2", 0.1, false, 535, 0, -120);
//
        spawnAsset("drzewo3", 0.1, false, 0, 0, -100);
        spawnAsset("drzewo6", 0.1, false, 100, 0, -75);
        spawnAsset("drzewo8", 0.1, false, 150, 0, -100);
        spawnAsset("drzewo10", 0.1, false, 200, 0, -100);
        spawnAsset("drzewo3", 0.1, false, 250, 0, -100);
        spawnAsset("drzewo5", 0.1, false, 300, 0, -75);
        spawnAsset("drzewo2", 0.1, false, 350, 0, -100);
        spawnAsset("drzewo8", 0.1, false, 400, 0, -75);
        spawnAsset("drzewo1", 0.1, false, 450, 0, -100);
        spawnAsset("drzewo10", 0.1, false, 500, 0, -75);
//
        spawnAsset("drzewo3", 0.1, false, 100, 0, -40);
        spawnAsset("drzewo6", 0.1, false, 129, 0, -66);
        spawnAsset("drzewo4", 0.1, false, 159, 0, -40);
        spawnAsset("drzewo9", 0.1, false, 229, 0, -66);
        spawnAsset("drzewo2", 0.1, false, 259, 0, -40);
        spawnAsset("drzewo3", 0.1, false, 329, 0, -40);
        spawnAsset("drzewo5", 0.1, false, 359, 0, -66);
        spawnAsset("drzewo7", 0.1, false, 429, 0, -66);
        spawnAsset("drzewo2", 0.1, false, 459, 0, -40);
        spawnAsset("drzewo5", 0.1, false, 529, 0, -66);
//
        spawnAsset("drzewo3", 0.1, false, 35, 0, -25);
        spawnAsset("drzewo6", 0.1, false, 135, 0, -15);
        spawnAsset("drzewo8", 0.1, false, 165, 0, -25);
        spawnAsset("drzewo10", 0.1, false, 235, 0, -25);
        spawnAsset("drzewo4", 0.1, false, 265, 0, -15);
        spawnAsset("drzewo2", 0.1, false, 335, 0, -15);
        spawnAsset("drzewo4", 0.1, false, 365, 0, -15);
        spawnAsset("drzewo7", 0.1, false, 435, 0, -25);
        spawnAsset("drzewo8", 0.1, false, 465, 0, -25);
        spawnAsset("drzewo2", 0.1, false, 535, 0, -25);
//
        spawnAsset("drzewo3", 0.1, false, 50, 0, -0);
        spawnAsset("drzewo6", 0.1, false, 100, 0, 10);
        spawnAsset("drzewo8", 0.1, false, 150, 0, -0);
        spawnAsset("drzewo10", 0.1, false, 200, 0, 10);
        spawnAsset("drzewo3", 0.1, false, 250, 0, 10);
        spawnAsset("drzewo5", 0.1, false, 300, 0, -0);
        spawnAsset("drzewo2", 0.1, false, 350, 0, -0);
        spawnAsset("drzewo8", 0.1, false, 400, 0, 10);
        spawnAsset("drzewo1", 0.1, false, 450, 0, -0);
        spawnAsset("drzewo10", 0.1, false, 500, 0, 10);


        spawnAsset("drzewo3", 0.1, false, -100, 0, -200);
        spawnAsset("drzewo6", 0.1, false, -129, 0, -250);
        spawnAsset("drzewo4", 0.1, false, -159, 0, -200);
        spawnAsset("drzewo9", 0.1, false, -229, 0, -250);
        spawnAsset("drzewo2", 0.1, false, -259, 0, -200);
        spawnAsset("drzewo3", 0.1, false, -329, 0, -250);
        spawnAsset("drzewo5", 0.1, false, -359, 0, -200);
        spawnAsset("drzewo7", 0.1, false, -429, 0, -200);
        spawnAsset("drzewo2", 0.1, false, -459, 0, -250);
        spawnAsset("drzewo5", 0.1, false, -529, 0, -200);
//
        spawnAsset("drzewo3", 0.1, false, -35, 0, -150);
        spawnAsset("drzewo6", 0.1, false, -135, 0, -120);
        spawnAsset("drzewo8", 0.1, false, -165, 0, -150);
        spawnAsset("drzewo10", 0.1, false, -235, 0, -120);
        spawnAsset("drzewo4", 0.1, false, -265, 0, -150);
        spawnAsset("drzewo2", 0.1, false, -335, 0, -120);
        spawnAsset("drzewo4", 0.1, false, -365, 0, -120);
        spawnAsset("drzewo7", 0.1, false, -435, 0, -150);
        spawnAsset("drzewo8", 0.1, false, -465, 0, -150);
        spawnAsset("drzewo2", 0.1, false, -535, 0, -120);
//
        spawnAsset("drzewo3", 0.1, false, -0, 0, -100);
        spawnAsset("drzewo6", 0.1, false, -100, 0, -75);
        spawnAsset("drzewo8", 0.1, false, -150, 0, -100);
        spawnAsset("drzewo10", 0.1, false, -200, 0, -100);
        spawnAsset("drzewo3", 0.1, false, -250, 0, -100);
        spawnAsset("drzewo5", 0.1, false, -300, 0, -75);
        spawnAsset("drzewo2", 0.1, false, -350, 0, -100);
        spawnAsset("drzewo8", 0.1, false, -400, 0, -75);
        spawnAsset("drzewo1", 0.1, false, -450, 0, -100);
        spawnAsset("drzewo10", 0.1, false, -500, 0, -75);
//
        spawnAsset("drzewo3", 0.1, false, -100, 0, -40);
        spawnAsset("drzewo6", 0.1, false, -129, 0, -66);
        spawnAsset("drzewo4", 0.1, false, -159, 0, -40);
        spawnAsset("drzewo9", 0.1, false, -229, 0, -66);
        spawnAsset("drzewo2", 0.1, false, -259, 0, -40);
        spawnAsset("drzewo3", 0.1, false, -329, 0, -40);
        spawnAsset("drzewo5", 0.1, false, -359, 0, -66);
        spawnAsset("drzewo7", 0.1, false, -429, 0, -66);
        spawnAsset("drzewo2", 0.1, false, -459, 0, -40);
        spawnAsset("drzewo5", 0.1, false, -529, 0, -66);
//
        spawnAsset("drzewo3", 0.1, false, -35, 0, -25);
        spawnAsset("drzewo6", 0.1, false, -135, 0, -15);
        spawnAsset("drzewo8", 0.1, false, -165, 0, -25);
        spawnAsset("drzewo10", 0.1, false, -235, 0, -25);
        spawnAsset("drzewo4", 0.1, false, -265, 0, -15);
        spawnAsset("drzewo2", 0.1, false, -335, 0, -15);
        spawnAsset("drzewo4", 0.1, false, -365, 0, -15);
        spawnAsset("drzewo7", 0.1, false, -435, 0, -25);
        spawnAsset("drzewo8", 0.1, false, -465, 0, -25);
        spawnAsset("drzewo2", 0.1, false, -535, 0, -25);
//
        spawnAsset("drzewo3", 0.1, false, -50, 0, -0);
        spawnAsset("drzewo6", 0.1, false, -100, 0, 10);
        spawnAsset("drzewo8", 0.1, false, -150, 0, -0);
        spawnAsset("drzewo10", 0.1, false, -200, 0, 10);
        spawnAsset("drzewo3", 0.1, false, -250, 0, 10);
        spawnAsset("drzewo5", 0.1, false, -300, 0, -0);
        spawnAsset("drzewo2", 0.1, false, -350, 0, -0);
        spawnAsset("drzewo8", 0.1, false, -400, 0, 10);
        spawnAsset("drzewo1", 0.1, false, -450, 0, -0);
        spawnAsset("drzewo10", 0.1, false, -500, 0, 10);


        spawnAsset("drzewo3", 0.1, false, 100, 0, 200);
        spawnAsset("drzewo6", 0.1, false, 129, 0, 250);
        spawnAsset("drzewo4", 0.1, false, 159, 0, 200);
        spawnAsset("drzewo9", 0.1, false, 229, 0, 250);
        spawnAsset("drzewo2", 0.1, false, 259, 0, 200);
        spawnAsset("drzewo3", 0.1, false, 329, 0, 250);
        spawnAsset("drzewo5", 0.1, false, 359, 0, 200);
        spawnAsset("drzewo7", 0.1, false, 429, 0, 200);
        spawnAsset("drzewo2", 0.1, false, 459, 0, 250);
        spawnAsset("drzewo5", 0.1, false, 529, 0, 200);
//
        spawnAsset("drzewo3", 0.1, false, 35, 0, 150);
        spawnAsset("drzewo6", 0.1, false, 135, 0, 120);
        spawnAsset("drzewo8", 0.1, false, 165, 0, 150);
        spawnAsset("drzewo10", 0.1, false, 235, 0, 120);
        spawnAsset("drzewo4", 0.1, false, 265, 0, 150);
        spawnAsset("drzewo2", 0.1, false, 335, 0, 120);
        spawnAsset("drzewo4", 0.1, false, 365, 0, 120);
        spawnAsset("drzewo7", 0.1, false, 435, 0, 150);
        spawnAsset("drzewo8", 0.1, false, 465, 0, 150);
        spawnAsset("drzewo2", 0.1, false, 535, 0, 120);
//
        spawnAsset("drzewo3", 0.1, false, 0, 0, 100);
        spawnAsset("drzewo6", 0.1, false, 100, 0, 75);
        spawnAsset("drzewo8", 0.1, false, 150, 0, 100);
        spawnAsset("drzewo10", 0.1, false, 200, 0, 100);
        spawnAsset("drzewo3", 0.1, false, 250, 0, 100);
        spawnAsset("drzewo5", 0.1, false, 300, 0, 75);
        spawnAsset("drzewo2", 0.1, false, 350, 0, 100);
        spawnAsset("drzewo8", 0.1, false, 400, 0, 75);
        spawnAsset("drzewo1", 0.1, false, 450, 0, 100);
        spawnAsset("drzewo10", 0.1, false, 500, 0, 75);
//
        spawnAsset("drzewo3", 0.1, false, 100, 0, 40);
        spawnAsset("drzewo6", 0.1, false, 129, 0, 66);
        spawnAsset("drzewo4", 0.1, false, 159, 0, 40);
        spawnAsset("drzewo9", 0.1, false, 229, 0, 66);
        spawnAsset("drzewo2", 0.1, false, 259, 0, 40);
        spawnAsset("drzewo3", 0.1, false, 329, 0, 40);
        spawnAsset("drzewo5", 0.1, false, 359, 0, 66);
        spawnAsset("drzewo7", 0.1, false, 429, 0, 66);
        spawnAsset("drzewo2", 0.1, false, 459, 0, 40);
        spawnAsset("drzewo5", 0.1, false, 529, 0, 66);
//
        spawnAsset("drzewo3", 0.1, false, 35, 0, 25);
        spawnAsset("drzewo6", 0.1, false, 135, 0, 15);
        spawnAsset("drzewo8", 0.1, false, 165, 0, 25);
        spawnAsset("drzewo10", 0.1, false, 235, 0, 25);
        spawnAsset("drzewo4", 0.1, false, 265, 0, 15);
        spawnAsset("drzewo2", 0.1, false, 335, 0, 15);
        spawnAsset("drzewo4", 0.1, false, 365, 0, 15);
        spawnAsset("drzewo7", 0.1, false, 435, 0, 25);
        spawnAsset("drzewo8", 0.1, false, 465, 0, 25);
        spawnAsset("drzewo2", 0.1, false, 535, 0, 25);
//
        spawnAsset("drzewo3", 0.1, false, 50, 0, 0);
        spawnAsset("drzewo6", 0.1, false, 100, 0, 10);
        spawnAsset("drzewo8", 0.1, false, 150, 0, 0);
        spawnAsset("drzewo10", 0.1, false, 200, 0, 10);
        spawnAsset("drzewo3", 0.1, false, 250, 0, 10);
        spawnAsset("drzewo5", 0.1, false, 300, 0, 0);
        spawnAsset("drzewo2", 0.1, false, 350, 0, 0);
        spawnAsset("drzewo8", 0.1, false, 400, 0, 10);
        spawnAsset("drzewo1", 0.1, false, 450, 0, 0);
        spawnAsset("drzewo10", 0.1, false, 500, 0, 10);


        spawnAsset("drzewo3", 0.1, false, -100, 0, 200);
        spawnAsset("drzewo6", 0.1, false, -129, 0, 250);
        spawnAsset("drzewo4", 0.1, false, -159, 0, 200);
        spawnAsset("drzewo9", 0.1, false, -229, 0, 250);
        spawnAsset("drzewo2", 0.1, false, -259, 0, 200);
        spawnAsset("drzewo3", 0.1, false, -329, 0, 250);
        spawnAsset("drzewo5", 0.1, false, -359, 0, 200);
        spawnAsset("drzewo7", 0.1, false, -429, 0, 200);
        spawnAsset("drzewo2", 0.1, false, -459, 0, 250);
        spawnAsset("drzewo5", 0.1, false, -529, 0, 200);
//
        spawnAsset("drzewo3", 0.1, false, -35, 0, 150);
        spawnAsset("drzewo6", 0.1, false, -135, 0, 120);
        spawnAsset("drzewo8", 0.1, false, -165, 0, 150);
        spawnAsset("drzewo10", 0.1, false, -235, 0, 120);
        spawnAsset("drzewo4", 0.1, false, -265, 0, 150);
        spawnAsset("drzewo2", 0.1, false, -335, 0, 120);
        spawnAsset("drzewo4", 0.1, false, -365, 0, 120);
        spawnAsset("drzewo7", 0.1, false, -435, 0, 150);
        spawnAsset("drzewo8", 0.1, false, -465, 0, 150);
        spawnAsset("drzewo2", 0.1, false, -535, 0, 120);
//
        spawnAsset("drzewo3", 0.1, false, -0, 0, 100);
        spawnAsset("drzewo6", 0.1, false, -100, 0, 75);
        spawnAsset("drzewo8", 0.1, false, -150, 0, 100);
        spawnAsset("drzewo10", 0.1, false, -200, 0, 100);
        spawnAsset("drzewo3", 0.1, false, -250, 0, 100);
        spawnAsset("drzewo5", 0.1, false, -300, 0, 75);
        spawnAsset("drzewo2", 0.1, false, -350, 0, 100);
        spawnAsset("drzewo8", 0.1, false, -400, 0, 75);
        spawnAsset("drzewo1", 0.1, false, -450, 0, 100);
        spawnAsset("drzewo10", 0.1, false, -500, 0, 75);
//
        spawnAsset("drzewo3", 0.1, false, -100, 0, 40);
        spawnAsset("drzewo6", 0.1, false, -129, 0, 66);
        spawnAsset("drzewo4", 0.1, false, -159, 0, 40);
        spawnAsset("drzewo9", 0.1, false, -229, 0, 66);
        spawnAsset("drzewo2", 0.1, false, -259, 0, 40);
        spawnAsset("drzewo3", 0.1, false, -329, 0, 40);
        spawnAsset("drzewo5", 0.1, false, -359, 0, 66);
        spawnAsset("drzewo7", 0.1, false, -429, 0, 66);
        spawnAsset("drzewo2", 0.1, false, -459, 0, 40);
        spawnAsset("drzewo5", 0.1, false, -529, 0, 66);
//
        spawnAsset("drzewo3", 0.1, false, -35, 0, 25);
        spawnAsset("drzewo6", 0.1, false, -135, 0, 15);
        spawnAsset("drzewo8", 0.1, false, -165, 0, 25);
        spawnAsset("drzewo10", 0.1, false, -235, 0, 25);
        spawnAsset("drzewo4", 0.1, false, -265, 0, 15);
        spawnAsset("drzewo2", 0.1, false, -335, 0, 15);
        spawnAsset("drzewo4", 0.1, false, -365, 0, 15);
        spawnAsset("drzewo7", 0.1, false, -435, 0, 25);
        spawnAsset("drzewo8", 0.1, false, -465, 0, 25);
        spawnAsset("drzewo2", 0.1, false, -535, 0, 25);
//
        spawnAsset("drzewo3", 0.1, false, -50, 0, 0);
        spawnAsset("drzewo6", 0.1, false, -100, 0, 10);
        spawnAsset("drzewo8", 0.1, false, -150, 0, 0);
        spawnAsset("drzewo10", 0.1, false, -200, 0, 10);
        spawnAsset("drzewo3", 0.1, false, -250, 0, 10);
        spawnAsset("drzewo5", 0.1, false, -300, 0, 0);
        spawnAsset("drzewo2", 0.1, false, -350, 0, 0);
        spawnAsset("drzewo8", 0.1, false, -400, 0, 10);
        spawnAsset("drzewo1", 0.1, false, -450, 0, 0);
        spawnAsset("drzewo10", 0.1, false, -500, 0, 10);



    spawnAsset("kamien1", 0.1, false, 0, 0, -100);
    spawnAsset("kamien2", 0.1, false, 50, 0, -100);
    spawnAsset("kamien3", 0.1, false, 100, 0, -100);
    spawnAsset("kamien4", 0.1, false, 150, 0, -100);
    spawnAsset("kamien5", 0.1, false, 200, 0, -100);
    spawnAsset("kamien1", 0.1, false, 0, 0, 100);
    spawnAsset("kamien2", 0.1, false, 50, 0, 100);
    spawnAsset("kamien3", 0.1, false, 100, 0, 100);
    spawnAsset("kamien4", 0.1, false, 150, 0, 100);
    spawnAsset("kamien5", 0.1, false, 200, 0, 100);
    spawnAsset("kamien1", 0.1, false, 0, 0, -10);
    spawnAsset("kamien2", 0.1, false, -50, 0, -100);
    spawnAsset("kamien3", 0.1, false, 100, 0, 100);
    spawnAsset("kamien4", 0.1, false, -150, 0, 100);
    spawnAsset("kamien5", 0.1, false, 200, 0, -100);



    spawnAsset("gora1", 0.5, false, -400, 30, 200);
    spawnAsset("gora2", 0.5, false, -400, 30, 300);
    spawnAsset("gora3", 0.5, false, -450, 30, 400);
    spawnAsset("gora1", 0.5, false, -300, 30, 200);
    spawnAsset("gora2", 0.5, false, -200, 30, 350);
    spawnAsset("gora3", 0.5, false, -350, 30, 400);

    spawnAsset("gora1", 0.5, false, -300, 30, 150);
    spawnAsset("gora2", 0.5, false, -300, 30, 75);
    spawnAsset("gora3", 0.5, false, -300, 30, 0);
    spawnAsset("gora1", 0.5, false, -300, 30, -100);
    spawnAsset("gora2", 0.5, false, -300, 30, -250);
    spawnAsset("gora3", 0.5, false, -300, 30, -500);

    spawnAsset("gora1", 0.5, false, 300, 30, -150);
    spawnAsset("gora2", 0.5, false, 300, 30, -75);
    spawnAsset("gora3", 0.5, false, 300, 30, 0);
    spawnAsset("gora1", 0.5, false, 300, 30, 100);
    spawnAsset("gora2", 0.5, false, 300, 30, 250);
    spawnAsset("gora3", 0.5, false, 300, 30, 500);


    spawnAsset("lake", 0.4, false, 0, -6.7, 0, function(o) {
        o.addRotation(0, 2*Math.PI, 0);
    });
    spawnAsset("amunicja", 0.1, true, 50, 3, -150);
    spawnAsset("mrtank", 0.1, true, 0, 3, 0, function(o) {tank = o});
    spawnAsset("mrcannon", 0.1, true, 0, 4, 0, function(o) {cannon = o});
    spawnAsset("rocket", 0.05, true, 10, 4, 5, function(o) {rocketTemplate = o});

    // Loader callback
    loader.onFinish = function() {
        cannon.parent = tank;
        cannon.scaling = new BABYLON.Vector3(1, 1, 1);
        cannon.position = new BABYLON.Vector3(0, 2, 0);
        //tank.physicsImpostor.friction = 0.8;

        camera = new BABYLON.FollowCamera("FollowCam", new BABYLON.Vector3(0, 10, 0), scene);
        camera.radius = 30;
        camera.heightOffset = 10;
        camera.rotationOffset = 270;
        camera.cameraAcceleration = 0.015;
        camera.maxCameraSpeed = 20;
        camera.attachControl(canvas, true);
        //camera.lockedTarget = tank;

        initLeapMotionRemote("127.0.0.1");

        engine.runRenderLoop(function () {
            scene.render();
        });
    };

    loader.load();

    return scene;
};

var scene = createScene();

function fire() {
    var rocket = rocketTemplate.clone();
    rocket.rotationQuaternion.copyFrom(cannon.rotationQuaternion.multiply(tank.rotationQuaternion));
    var matrix = new BABYLON.Matrix();
    rocket.rotationQuaternion.toRotationMatrix(matrix);
    var direction = BABYLON.Vector3.TransformNormal(new BABYLON.Vector3(50, 0, 0), matrix);
    var spawnOffset = BABYLON.Vector3.TransformNormal(new BABYLON.Vector3(4, 2, 0), matrix);
    rocket.position.copyFrom(tank.position);
    rocket.position.addInPlace(spawnOffset);
    rocket.physicsImpostor.setLinearVelocity(direction);
}

function moveTank(forward) {
    var matrix = new BABYLON.Matrix();
    tank.rotationQuaternion.toRotationMatrix(matrix);
    var direction = BABYLON.Vector3.TransformNormal(new BABYLON.Vector3(5 * forward, 0, 0), matrix);
    tank.physicsImpostor.setLinearVelocity(direction);
    //tank.physicsImpostor.applyImpulse(direction, new BABYLON.Vector3(0, 0, 0));
}

function rotateTank(direction) {
    tank.addRotation(0, Math.PI * direction / 100, 0);
}

// Window resize
window.addEventListener("resize", function () { // Watch for browser/canvas resize events
    engine.resize();
});

// Input
var socket;
function pageLoad() {
    socket = io();
    socket.on('STATE', function(state) {
        if (typeof state !== 'undefined') {
          sphere.position.x = state.tank.x;
        }
    });
    $('canvas').keypress(function(e) {
        if (e.which == 32) { // Space
            fire();
        } else if (e.which == 113) { // Q
            cannon.addRotation(0, -Math.PI / 20, 0);
        } else if (e.which == 101) { // E
            cannon.addRotation(0, Math.PI / 20, 0);
        } else if (e.which == 119) { // W
            moveTank(1);
        } else if (e.which == 115) { // S
            moveTank(-1);
        } else if (e.which == 97) { // A
            rotateTank(-1);
        } else if (e.which == 100) { // D
            rotateTank(1);
        } else {
            console.log("Key press: " + e.which);
        }
    });
}

document.addEventListener('DOMContentLoaded', pageLoad);
