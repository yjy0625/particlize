var PRINT_CAM = true;

function load() {
	var camera, tick = 0,
		scene, renderer, clock = new THREE.Clock(),
		controls, container, gui = new dat.GUI( { width: 350 } ),
		options, spawnerOptions;

	var particleSystems = [];
	var controllingParticleSystem = null;
	const speedMultiplier = 1.0;

	var stats;

	initDisplay();
	animate();
	detectHand();

	function initDisplay() {

		//

		container = document.getElementById( 'container' );

		camera = new THREE.PerspectiveCamera( 28, window.innerWidth / window.innerHeight, 1, 10000 );
		camera.position.z = 100;

		scene = new THREE.Scene();
		scene.background = new THREE.Color( 0x000000 );

		// options passed during each spawned

		options = {
			position: new THREE.Vector3(),
			positionRandomness: .3,
			velocity: new THREE.Vector3(),
			velocityRandomness: .5,
			color: 0xaa88ff,
			colorRandomness: .2,
			turbulence: .5,
			lifetime: 2,
			size: 5,
			sizeRandomness: 1
		};

		spawnerOptions = {
			spawnRate: 15000,
			horizontalSpeed: 1.5,
			verticalSpeed: 1.33,
			timeScale: 1
		};

		//

		gui.add( options, "velocityRandomness", 0, 3 );
		gui.add( options, "positionRandomness", 0, 3 );
		gui.add( options, "size", 1, 20 );
		gui.add( options, "sizeRandomness", 0, 25 );
		gui.add( options, "colorRandomness", 0, 1 );
		gui.add( options, "lifetime", .1, 10 );
		gui.add( options, "turbulence", 0, 1 );

		gui.add( spawnerOptions, "spawnRate", 10, 30000 );
		gui.add( spawnerOptions, "timeScale", -1, 1 );

		//

		stats = new Stats();
		container.appendChild( stats.dom );

		//

		renderer = new THREE.WebGLRenderer();
		renderer.setPixelRatio( window.devicePixelRatio );
		renderer.setSize( window.innerWidth, window.innerHeight );
		renderer.setClearColor( 0x000000, 0 );
		container.appendChild( renderer.domElement );

		//

		controls = new THREE.TrackballControls( camera, renderer.domElement );
		controls.rotateSpeed = 5.0;
		controls.zoomSpeed = 2.2;
		controls.panSpeed = 1;
		controls.dynamicDampingFactor = 0.3;

		window.addEventListener( 'resize', onWindowResize, false );

	}

	function onWindowResize() {

		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();

		renderer.setSize( window.innerWidth, window.innerHeight );

	}

	function animate() {

		for(var i = 0; i < particleSystems.length; i++) {
			var ps = particleSystems[i];
			var psSpeed = ps.options.speed;
			ps.options.position.x += psSpeed.x * speedMultiplier;
			ps.options.position.y += psSpeed.y * speedMultiplier;
			updateParticleSystem(particleSystem);
		}

		if(controllingParticleSystem != null) {
			updateParticleSystem(controllingParticleSystem);
		}

	}

	function createParticleSystem() {

		var particleSystem = new THREE.GPUParticleSystem( {
			maxParticles: 250000
		} );

		particleSystem.options = clone(options);
		particleSystem.options.speed = {x: 0.0, y: 0.0};

		scene.add( particleSystem );

		return particleSystem;

	}

	function updateParticleSystem(particleSystem) {

		requestAnimationFrame( animate );

		controls.update();

		var delta = clock.getDelta() * spawnerOptions.timeScale;

		tick += delta;

		if ( tick < 0 ) tick = 0;

		if ( delta > 0 ) {

			for ( var x = 0; x < spawnerOptions.spawnRate * delta; x++ ) {

				particleSystem.spawnParticle( particleSystem.options );

			}

		}

		particleSystem.update( tick );

		render();

		stats.update();

	}

	function render() {

		renderer.render( scene, camera );

	}

	function detectHand() {

		var smoother = new Smoother([0.9995, 0.9995], [0, 0], 0),
			canvas = document.getElementById('video'),
			context = canvas.getContext('2d'),
			video = document.createElement('video'),
			detector;

		video.className = "video";

		try {
			compatibility.getUserMedia({video: true}, function(stream) {
				try {
					video.src = compatibility.URL.createObjectURL(stream);
				} catch (error) {
					video.src = stream;
				}
				compatibility.requestAnimationFrame(play);
			}, function (error) {
				alert("WebRTC not available");
			});
		} catch (error) {
			alert(error);
		}

		var fist_pos_old, angle = [0, 0];
		
		function play() {
			compatibility.requestAnimationFrame(play);
			if (video.paused) video.play();
	        
	        // Draw video overlay:
			canvas.width = ~~(100 * video.videoWidth / video.videoHeight);
			canvas.height = 100;
			if(PRINT_CAM) {
				context.drawImage(video, 0, 0, canvas.clientWidth, canvas.clientHeight);
			}
			
			if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
			
				// Prepare the detector once the video dimensions are known:
	          	if (!detector) {
		      		var width = ~~(140 * video.videoWidth / video.videoHeight);
					var height = 140;
		      		detector = new objectdetect.detector(width, height, 1.1, objectdetect.handfist);
		      	}
	      		
	      		// Smooth rotation of the 3D object:
				angle = smoother.smooth(angle);

	      		// Perform the actual detection:
				var coords = detector.detect(video, 1);
				
				if (coords[0]) {
					// [startx, starty, width, height]
					var coord = coords[0].slice(0);
					// [startx, starty, endx, endy]
					var displayCoord = coord.slice(0);
					
					// Rescale coordinates from detector to video coordinate space:
					var drawWidth = canvas.width;
					var drawHeight = canvas.height;
					coord[0] *= drawWidth / detector.canvas.width;
					coord[1] *= drawHeight / detector.canvas.height;
					coord[2] *= drawWidth / detector.canvas.width;
					coord[3] *= drawHeight / detector.canvas.height;
					
					// Rescale coordinates from detector to three.js drawing coordinate space:
					var displayDrawWidth = drawWidth * 2;
					var displayDrawHeight = drawHeight * 2;
					var minX = -displayDrawWidth / 2;
					var maxX = displayDrawWidth / 2;
					var minY = -displayDrawHeight / 2;
					var maxY = displayDrawHeight / 2;

					displayCoord[0] = Math.floor(coord[0] * displayDrawWidth / drawWidth - displayDrawWidth / 2);
					displayCoord[1] = Math.floor(coord[1] * displayDrawHeight / drawHeight - displayDrawHeight / 2);
					displayCoord[2] = Math.ceil((coord[0] + coord[2]) * displayDrawWidth / drawWidth - displayDrawWidth / 2);
					displayCoord[3] = Math.ceil((coord[1] + coord[3]) * displayDrawHeight / drawHeight - displayDrawHeight / 2);

					// draw on three.js if recognition is stable
					if (fist_pos_old) {
						drawInRect(displayCoord);
					}
					else {
						drawInRect([1000,1000,1000,1000]);
					}
					
					// keep a record of fist position
					var fist_pos = [coord[0] + coord[2] / 2, coord[1] + coord[3] / 2];
					if (fist_pos_old) {
						var dx = (fist_pos[0] - fist_pos_old[0]) / video.videoWidth,
							dy = (fist_pos[1] - fist_pos_old[1]) / video.videoHeight;
						
						if (dx*dx + dy*dy < 0.2) {
							angle[0] += 5.0 * dx;
							angle[1] += 5.0 * dy;
						}
						fist_pos_old = fist_pos;
					} else if (coord[4] > 2) {
						fist_pos_old = fist_pos;
					}
				
					// Draw coordinates on video overlay:
					if(PRINT_CAM) {
						context.beginPath();
						context.lineWidth = '2';
						context.fillStyle = fist_pos_old ? 'rgba(0, 255, 255, 0.5)' : 'rgba(255, 0, 0, 0.5)';
						context.fillRect(coord[0], coord[1], coord[2], coord[3]);
						context.stroke();
					}
				} else fist_pos_old = null;
			}
		}

	}

	function drawInRect(coords) {
		var center = {
			x: (coords[0] + coords[2]) / 2,
			y: (coords[1] + coords[3]) / 2
		};

		var draw = coords.length >= 4;
		var isControlling = (controllingParticleSystem != null);
		var state = (isControlling? 1: 0) * 2 + (draw? 1: 0);
		console.log("Draw: " + (draw? 1: 0));

		// ASCII State Diagram
		//
		//  /---\     /---\     /---\     /---\
		//  | 0 | --> | 1 | --> | 3 | --> | 2 | 
		//  \---/     \---/     \---/     \---/
		//	  A						        |
		//    |                             |
		//	  \-----------------------------/
		//
		switch(state) {
		case 0: // x draw, x control
			break;
		case 1: // √ draw, x control -- first appearance of fist
			var newParticleSystem = createParticleSystem();
			newParticleSystem.options.previousPosition = center;
			newParticleSystem.options.position = center;
			controllingParticleSystem = newParticleSystem;
			break;
		case 2: // x draw, √ control
			newParticleSystem.options.speed = getDistance(
				newParticleSystem.options.previousPosition,
				newParticleSystem.options.position
			);
			particleSystems.push(newParticleSystem);
			controllingParticleSystem = null;
			break;
		case 3: // √ draw, √ control
			controllingParticleSystem.options.previousPosition = controllingParticleSystem.options.position;
			controllingParticleSystem.options.position = center;
			break;
		default:
			console.log("There is an error in your code! Life sucks.");
		}
	}
}

function clone(obj) {
    if (null == obj || "object" != typeof obj) return obj;
    var copy = obj.constructor();
    for (var attr in obj) {
        if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
    }
    return copy;
}

function getDistance(pt1, pt2) {
	return Math.sqrt(Math.pow(pt1.x - pt2.x, 2.0) + Math.pow(pt1.y - pt2.y, 2.0));
}