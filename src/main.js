//Create the renderer
let App = PIXI.Application,
	Container = PIXI.Container,
	loader = PIXI.loader,
	resources = PIXI.loader.resources,
	Sprite = PIXI.Sprite,
	Graphics = PIXI.Graphics,
	TextureCache = PIXI.utils.TextureCache;
MovieClip = PIXI.extras.AnimatedSprite;

let app = new App({
	width: 417,
	height: 736,
	antialias: true,
	transparent: false,
	resolution: 2,
	autoResize: true,
	backgroundColor: 0x202124
});
app.stage.interactive = true;

let su = new SpriteUtilities(PIXI);

//Add the canvas to the HTML document
document.body.appendChild(app.view);

// units
let state, rocket, rocketInnerContainer, rocketOuterContainer, id;

// load resources
let loadProgressHandler = (loader, resource) => {
	console.log(`loading ${resource.url}`);
	console.log(`progress ${loader.progress}%`);
};

function keyboard(value) {
	let key = {};
	key.value = value;
	key.isDown = false;
	key.isUp = true;
	key.press = undefined;
	key.release = undefined;

	// down handler
	key.downHandler = event => {
		if (event.key === key.value) {
			if (key.isUp && key.press) key.press();
			key.isDown = true;
			key.isUp = false;
			event.preventDefault();
		}
	};

	// up handler
	key.upHandler = event => {
		if (event.key === key.value) {
			if (key.isDown && key.release) key.release();
			key.isDown = false;
			key.isUp = true;
			event.preventDefault();
		}
	};

	// attach event listeners
	const downListener = key.downHandler.bind(key);
	const upListener = key.upHandler.bind(key);

	window.addEventListener("keydown", downListener, false);
	window.addEventListener("keyup", upListener, false);

	// detach event listeners
	key.unsubscribe = () => {
		window.removeEventListener("keydown", downListener);
		window.removeEventListener("keyup", upListener);
	};

	return key;
}

let starAmount = 350,
	cameraZ = 0,
	fov = 20,
	starBaseSpeed = 0.025,
	starSpeed = 0,
	warpSpeed = 0,
	starStretch = 5,
	starBaseSize = 0.05;

// play
let stars = [];

let setup = () => {
	id = resources["images/rocket.json"].textures;

	// stars!
	let starShape = new Graphics();
	starShape.beginFill(0xffffff);
	starShape.drawCircle(0, 0, 1.5);
	starShape.endFill();

	let starTexture = starShape.generateTexture();

	for (let i = 0; i < starAmount; i++) {
		let star = {
			sprite: new Sprite(starTexture),
			z: 0,
			x: 0,
			y: 0,
			vy: (Math.random() + 1) * 0.6
		};
		star.sprite.anchor.x = 0.5;
		star.sprite.anchor.y = 0.5;
		randomizeStar(star.sprite);
		app.stage.addChild(star.sprite);
		stars.push(star);
	}

	// rocket
	rocket = new Container();
	rocketOuterContainer = new Container();

	let rocketBody = new Sprite(id["rocket_body.png"]);
	let rocketWindow = new Sprite(id["window.png"]);
	rocketWindow.x = rocketBody.width / 2 - rocketWindow.width / 2;
	rocketWindow.y = rocketBody.height / 3;

	let flame = new Sprite(id["flame.png"]);
	flame.x = rocketBody.width / 2 - flame.width / 2;
	flame.y = rocketBody.height - 5;

	let wingFrames = su.frameSeries(0, 18, "wing_sprite-", ".png");
	let wingSprite = new MovieClip(wingFrames);

	wingSprite.x = rocketBody.width / 2 - wingSprite.width / 2;
	wingSprite.y = rocketBody.height - 48;

	// acceleration + friction
	rocket.accelerationX = 0;
	rocket.frictionX = 1;
	rocket.accelerationY = 0;
	rocket.frictionY = 1;
	rocket.speed = 0.2;
	rocket.drag = 0.4;

	rocket.addChild(flame);
	rocket.addChild(rocketBody);
	rocket.addChild(rocketWindow);
	rocket.addChild(wingSprite);

	// init velocity props and position
	rocket.scale.set(0.5);
	rocket.x = app.screen.width / 2 - rocket.width / 2;
	rocket.y = app.screen.height - rocket.height - 100;
	rocket.vx = 0;
	rocket.vy = 0;

	// rocketOuterContainer.addChild(rocket);
	app.stage.addChild(rocket);

	// background
	let saturn = new Sprite(id["planet_saturn.png"]);
	let mars = new Sprite(id["planet_mars.png"]);
	saturn.scale.set(0.5);
	mars.scale.set(0.5);

	app.stage.addChild(saturn);
	app.stage.addChild(mars);

	// keyboard
	let left = keyboard("ArrowLeft"),
		right = keyboard("ArrowRight"),
		up = keyboard("ArrowUp"),
		down = keyboard("ArrowDown");

	let wingReversed = false;

	// left key press
	left.press = () => {
		// rocket.vx = -5;
		rocket.accelerationX = -rocket.speed;
		rocket.frictionX = 1;

		if (!wingReversed){
			wingFrames.reverse();
			wingReversed = true;
		}
		wingSprite.play();
	};

	left.release = () => {
		if (!right.isDown) {
			// rocket.vx = 0;
			rocket.accelerationX = 0;
			rocket.frictionX = rocket.drag;
		}
		wingFrames.reverse();
		wingReversed = false;
		wingSprite.gotoAndStop(0);
	};

	// right key press
	right.press = () => {
		// rocket.vx = 5;
		rocket.accelerationX = rocket.speed;
		rocket.frictionX = 1;

		wingSprite.play();
	};

	right.release = () => {
		if (!left.isDown) {
			// rocket.vx = 0;
			rocket.accelerationX = 0;
			rocket.frictionX = rocket.drag;
		}
		wingSprite.gotoAndStop(0);
	};

	// up key press
	up.press = () => {
		rocket.accelerationY = -rocket.speed;
		rocket.frictionY = 1;
	};

	up.release = () => {
		if (!down.isDown) {
			rocket.accelerationY = 0;
			rocket.frictionY = rocket.drag;
		}
	};

	// down key press
	down.press = () => {
		rocket.accelerationY = rocket.speed;
		rocket.frictionY = 1;
	};

	down.release = () => {
		if (!up.isDown) {
			rocket.accelerationY = 0;
			rocket.frictionY = rocket.drag;
		}
	};

	state = play;

	app.ticker.add(delta => gameLoop(delta));
};
// game loop
let gameLoop = delta => {
	state(delta);
};
let play = delta => {
	// add acceleration to velocity
	rocket.vx += rocket.accelerationX;
	rocket.vy += rocket.accelerationY;
	// add friction
	rocket.vx *= rocket.frictionX;
	rocket.vy *= rocket.frictionY;

	let collision = contain(rocket, {
		x: 0,
		y: 0,
		width: app.screen.width,
		height: app.screen.height
	});

	//Check for a collision. If the value of `collision` isn't
	//`undefined` then you know the sprite hit a boundary
	if (collision) {
		//Reverse the sprite's `vx` value if it hits the left or right
		if (collision.has("left") || collision.has("right")) {
			rocket.vx = -rocket.vx;
		}

		//Reverse the sprite's `vy` value if it hits the top or bottom
		if (collision.has("top") || collision.has("bottom")) {
			rocket.vy = -rocket.vy;
		}

		//Optionally display the values that the `collision` set contains
		collision.forEach(item => console.log(item));
	}
	// update velocity
	rocket.vx = rocket.vx;
	rocket.x += rocket.vx;

	rocket.vy = rocket.vy;
	rocket.y += rocket.vy;

	// jiggle

	// starz
	//Simple easing. This should be changed to proper easing function when used for real.
	starSpeed += (warpSpeed - starSpeed) / 20;
	cameraZ += delta * 10 * (starSpeed + starBaseSpeed);
	for (var i = 0; i < starAmount; i++) {
		var star = stars[i];
		star.sprite.y += star.vy;
		star.sprite.scale.y = 1.5;
		if (star.sprite.y > app.screen.height) {
			star.sprite.y = 0;
		}
	}
};

//The contain helper function
function contain(sprite, container) {
	//Create a set called `collision` to keep track of the
	//boundaries with which the sprite is colliding
	var collision = new Set();

	//Left
	if (sprite.x < container.x) {
		sprite.x = container.x;
		collision.add("left");
	}

	//Top
	if (sprite.y < container.y) {
		sprite.y = container.y;
		collision.add("top");
	}

	//Right
	if (sprite.x + sprite.width > container.width) {
		sprite.x = container.width - sprite.width;
		collision.add("right");
	}

	//Bottom
	if (sprite.y + sprite.height > container.height) {
		sprite.y = container.height - sprite.height;
		collision.add("bottom");
	}

	//If there were no collisions, set `collision` to `undefined`
	if (collision.size === 0) collision = undefined;

	//Return the `collision` value
	return collision;
}

function randomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomizeStar(star) {
	star.x = randomInt(0, app.screen.width);
	star.y = randomInt(0, app.screen.height);
	star.vy = Math.random() + 1;
	star.alpha = Math.random();
}

// kick it off!

loader
	.add(["images/rocket.json"])
	.on("progress", loadProgressHandler)
	.load(setup);

let scale;
let onResize = event => {
	return (scale = scaleToWindow(app.renderer.view, "black"));
};
window.addEventListener("resize", onResize);
onResize();
