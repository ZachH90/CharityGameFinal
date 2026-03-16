const canvas = document.getElementById("gameCanvas");
const context = canvas.getContext("2d");
const startButton = document.getElementById("startButton");
const mobileViewportQuery = window.matchMedia("(max-width: 768px)");

const launcherX = canvas.width / 2;
const launcherY = canvas.height - 110;
const minAngle = (-60 * Math.PI) / 180;
const maxAngle = (60 * Math.PI) / 180;

let arrowAngle = minAngle;
let swingDirection = 1;
let isAngleLocked = false;
let rotationSpeed = 1.5;

const powerBarWidth = 240;
const powerBarHeight = 18;
const powerBarX = launcherX - powerBarWidth / 2;
const powerBarY = canvas.height - powerBarHeight - 8;

let perfectZoneStart = 0.72;
let perfectZoneSize = 0.12;
let throwRandomness = 0;
let cameraZoom = 1;
let targetIconStyle = "bucket";
let targetImage = null;
let targetLabelLines = [];
let baseTargetX = canvas.width * 0.72;
let baseTargetY = canvas.height * 0.18;
let targetShiftRange = 0;
let targetMinX = 0;
let targetMaxX = 0;
let targetMinY = 0;
let targetMaxY = 0;
let levelGallons = 0;
let totalGallons = 0;
let currentGoalGallons = 50;
let currentSplashMaxRadius = 40;
let currentSplashGrowthRate = 130;
let baseRotationSpeed = 1.5;
let basePowerSpeed = 0.9;
let speedVariancePercentMin = 0.05;
let speedVariancePercentMax = 0.1;

const targetArea = {
  x: canvas.width * 0.72,
  y: canvas.height * 0.18,
  width: 130,
  height: 90,
};

let powerValue = 0;
let powerDirection = 1;
let isPowerLocked = false;
let powerSpeed = 0.9;

const gravity = 480;
let droplet = {
  isActive: false,
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  radius: 7,
};

let splash = {
  isActive: false,
  x: 0,
  y: 0,
  radius: 0,
  maxRadius: 40,
  growthRate: 130,
  hasScored: false,
  gallonsAwarded: 0,
};

let inputPhase = "aim";
let lastTimestamp = 0;
let currentLevel = 1;
const maxLevel = 3;

let isLevelTransitioning = false;
let transitionTimer = 0;
const transitionDuration = 1;
let transitionStartScale = 1;
let transitionEndScale = 1;
let queuedLevel = null;
let isGameWon = false;

const impactMessages = {
  1: "You helped a family get clean water today.",
  2: "You helped a whole town access clean water.",
  3: "Your action supports clean water for entire regions.",
};

const levelGoalGallons = {
  1: 50,
  2: 500,
  3: 5000000,
};

function createTargetImage(relativePath) {
  const image = new Image();
  image.src = relativePath;
  return image;
}

const levelTargetImages = {
  1: createTargetImage("img/desperate stick figu.png"),
  2: createTargetImage("img/minimal town with st.png"),
  3: createTargetImage("img/stick figures around.png"),
};

const levelTargetLabels = {
  1: ["Xing family from Tibet"],
  2: ["Casa Santana, Cuba", "Poor Drinking Water"],
  3: ["Give everyone in the world fresh drinking water"],
};

let impactText = {
  isActive: false,
  timer: 0,
  fadeInDuration: 0.5,
  holdDuration: 4,
  fadeOutDuration: 0.5,
  duration: 5,
  message: "",
};

let missText = {
  isActive: false,
  timer: 0,
  duration: 2.4,
  message: "We need to get water to these people! Try again",
};

const confettiColors = ["#ffd44d", "#2a7db9", "#5ec576", "#f26a5a", "#ffffff"];
let confettiParticles = [];

let winPanelBounds = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
};

let winLinkBounds = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
};

function drawImageContain(image, boxX, boxY, boxWidth, boxHeight) {
  const imageWidth = image.naturalWidth;
  const imageHeight = image.naturalHeight;

  if (!imageWidth || !imageHeight) {
    return;
  }

  const imageAspect = imageWidth / imageHeight;
  const boxAspect = boxWidth / boxHeight;

  let drawWidth = boxWidth;
  let drawHeight = boxHeight;

  if (imageAspect > boxAspect) {
    drawHeight = boxWidth / imageAspect;
  } else {
    drawWidth = boxHeight * imageAspect;
  }

  const drawX = boxX + (boxWidth - drawWidth) / 2;
  const drawY = boxY + (boxHeight - drawHeight) / 2;

  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
}

function setRotationSpeed(speedInRadiansPerSecond) {
  rotationSpeed = Math.max(0, speedInRadiansPerSecond);
}

function lockAngle() {
  isAngleLocked = true;
}

function setPowerSpeed(speedPerSecond) {
  powerSpeed = Math.max(0, speedPerSecond);
}

function lockPower() {
  isPowerLocked = true;
}

function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomSignedPercent(minPercent, maxPercent) {
  const magnitude = randomRange(minPercent, maxPercent);
  const direction = Math.random() < 0.5 ? -1 : 1;
  return direction * magnitude;
}

function setTargetRandomBounds(minX, maxX, minY, maxY) {
  const absoluteMaxX = Math.max(0, canvas.width - targetArea.width);
  const absoluteMaxY = Math.max(0, canvas.height - targetArea.height);

  const clampedMinX = clamp(minX, 0, absoluteMaxX);
  const clampedMaxX = clamp(maxX, clampedMinX, absoluteMaxX);
  const clampedMinY = clamp(minY, 0, absoluteMaxY);
  const clampedMaxY = clamp(maxY, clampedMinY, absoluteMaxY);

  targetMinX = clampedMinX;
  targetMaxX = clampedMaxX;
  targetMinY = clampedMinY;
  targetMaxY = clampedMaxY;
}

function resetAttemptState() {
  inputPhase = "aim";
  isAngleLocked = false;
  isPowerLocked = false;
  arrowAngle = minAngle;
  swingDirection = 1;
  powerValue = 0;
  powerDirection = 1;
  droplet.isActive = false;
  splash.isActive = false;
  splash.radius = 0;
  splash.hasScored = false;
  splash.gallonsAwarded = 0;
  isGameWon = false;
  impactText.isActive = false;
  missText.isActive = false;
  missText.timer = 0;
  queuedLevel = null;
  isLevelTransitioning = false;
  transitionTimer = 0;

  startButton.classList.remove("is-hidden");

  applyAttemptVariance();
}

function showWinScreen() {
  isGameWon = true;
  inputPhase = "won";
  isAngleLocked = true;
  isPowerLocked = true;
  droplet.isActive = false;

  startButton.classList.remove("is-hidden");
}

function resetToLevelOne() {
  currentLevel = 1;
  totalGallons = 0;
  loadLevel(1);
  resetAttemptState();
}

function getCameraScale() {
  if (!isLevelTransitioning) {
    return cameraZoom;
  }

  const linearT = clamp(transitionTimer / transitionDuration, 0, 1);
  const easedT = 1 - Math.pow(1 - linearT, 3);
  return transitionStartScale + (transitionEndScale - transitionStartScale) * easedT;
}

function startLevelTransition(nextLevel) {
  if (isLevelTransitioning) {
    return;
  }

  isLevelTransitioning = true;
  transitionTimer = 0;
  queuedLevel = nextLevel;
  transitionStartScale = cameraZoom;
  transitionEndScale = Math.max(0.62, cameraZoom * 0.74);
  inputPhase = "transition";
}

function startImpactText(levelNumber) {
  impactText.isActive = true;
  impactText.timer = 0;
  impactText.duration =
    impactText.fadeInDuration + impactText.holdDuration + impactText.fadeOutDuration;
  impactText.message = impactMessages[levelNumber] || "";
  spawnConfetti(64);
}

function startMissText() {
  missText.isActive = true;
  missText.timer = 0;
}

function updateImpactText(deltaTimeInSeconds) {
  if (!impactText.isActive) {
    return;
  }

  impactText.timer += deltaTimeInSeconds;

  if (impactText.timer >= impactText.duration) {
    impactText.isActive = false;
    impactText.timer = 0;
  }
}

function updateMissText(deltaTimeInSeconds) {
  if (!missText.isActive) {
    return;
  }

  missText.timer += deltaTimeInSeconds;

  if (missText.timer >= missText.duration) {
    missText.isActive = false;
    missText.timer = 0;
  }
}

function spawnConfetti(count) {
  for (let index = 0; index < count; index += 1) {
    confettiParticles.push({
      x: canvas.width / 2 + randomRange(-180, 180),
      y: randomRange(24, 84),
      vx: randomRange(-170, 170),
      vy: randomRange(-260, -80),
      size: randomRange(4, 8),
      color: confettiColors[Math.floor(randomRange(0, confettiColors.length))],
      rotation: randomRange(0, Math.PI * 2),
      rotationSpeed: randomRange(-7, 7),
      life: randomRange(1.6, 2.6),
      maxLife: 2.6,
    });
  }
}

function updateConfetti(deltaTimeInSeconds) {
  if (!confettiParticles.length) {
    return;
  }

  const confettiGravity = 540;
  for (let index = confettiParticles.length - 1; index >= 0; index -= 1) {
    const particle = confettiParticles[index];
    particle.vy += confettiGravity * deltaTimeInSeconds;
    particle.x += particle.vx * deltaTimeInSeconds;
    particle.y += particle.vy * deltaTimeInSeconds;
    particle.rotation += particle.rotationSpeed * deltaTimeInSeconds;
    particle.life -= deltaTimeInSeconds;

    if (particle.life <= 0 || particle.y > canvas.height + 20) {
      confettiParticles.splice(index, 1);
    }
  }
}

function drawConfetti() {
  if (!confettiParticles.length) {
    return;
  }

  context.save();
  for (let index = 0; index < confettiParticles.length; index += 1) {
    const particle = confettiParticles[index];
    const alpha = clamp(particle.life / particle.maxLife, 0, 1);

    context.save();
    context.globalAlpha = alpha;
    context.translate(particle.x, particle.y);
    context.rotate(particle.rotation);
    context.fillStyle = particle.color;
    context.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
    context.restore();
  }
  context.restore();
}

function drawImpactText() {
  if (!impactText.isActive || !impactText.message) {
    return;
  }

  const fadeInEnd = impactText.fadeInDuration;
  const holdEnd = fadeInEnd + impactText.holdDuration;
  const fadeOutEnd = holdEnd + impactText.fadeOutDuration;

  let alpha = 1;
  if (impactText.timer < fadeInEnd) {
    alpha = impactText.timer / Math.max(impactText.fadeInDuration, 0.001);
  } else if (impactText.timer > holdEnd) {
    alpha = 1 - (impactText.timer - holdEnd) / Math.max(impactText.fadeOutDuration, 0.001);
  }

  alpha = clamp(alpha, 0, 1);
  const textX = canvas.width / 2;
  const textY = 58;

  context.save();
  context.globalAlpha = alpha;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = '600 24px "Segoe UI", Tahoma, sans-serif';

  const textWidth = context.measureText(impactText.message).width;
  const paddingX = 16;
  const paddingY = 10;
  context.fillStyle = "rgba(10, 40, 62, 0.55)";
  context.fillRect(
    textX - textWidth / 2 - paddingX,
    textY - 12 - paddingY,
    textWidth + paddingX * 2,
    24 + paddingY * 2
  );

  context.fillStyle = "#ffffff";
  context.fillText(impactText.message, textX, textY);
  context.restore();
}

function drawMissText() {
  if (!missText.isActive || !missText.message) {
    return;
  }

  const normalized = clamp(missText.timer / missText.duration, 0, 1);
  const alpha = normalized < 0.4 ? normalized / 0.4 : (1 - normalized) / 0.6;
  const textX = canvas.width / 2;
  const textY = 92;

  context.save();
  context.globalAlpha = clamp(alpha, 0, 1);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = '700 20px "Segoe UI", Tahoma, sans-serif';

  const textWidth = context.measureText(missText.message).width;
  const paddingX = 14;
  const paddingY = 8;
  context.fillStyle = "rgba(103, 27, 27, 0.68)";
  context.fillRect(
    textX - textWidth / 2 - paddingX,
    textY - 10 - paddingY,
    textWidth + paddingX * 2,
    20 + paddingY * 2
  );

  context.fillStyle = "#ffffff";
  context.fillText(missText.message, textX, textY);
  context.restore();
}

function drawWinScreen() {
  if (!isGameWon) {
    winPanelBounds.width = 0;
    winLinkBounds.width = 0;
    return;
  }

  context.save();
  context.fillStyle = "rgba(7, 29, 44, 0.64)";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const panelWidth = 620;
  const panelHeight = 250;
  const panelX = (canvas.width - panelWidth) / 2;
  const panelY = (canvas.height - panelHeight) / 2;
  const panelCenterX = canvas.width / 2;

  winPanelBounds.x = panelX;
  winPanelBounds.y = panelY;
  winPanelBounds.width = panelWidth;
  winPanelBounds.height = panelHeight;

  context.fillStyle = "#ffffff";
  context.fillRect(panelX, panelY, panelWidth, panelHeight);
  context.strokeStyle = "#2c4b63";
  context.lineWidth = 3;
  context.strokeRect(panelX, panelY, panelWidth, panelHeight);

  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#103a54";
  context.font = '700 38px "Segoe UI", Tahoma, sans-serif';
  context.fillText("You made a global impact!", panelCenterX, panelY + 62);

  context.fillStyle = "#29566f";
  context.font = '600 22px "Segoe UI", Tahoma, sans-serif';
  context.fillText("Its not an easy task getting water to the world", panelCenterX, panelY + 110);
  context.fillText("we need your help", panelCenterX, panelY + 140);

  const linkText = "find out how you can help";
  context.font = '700 20px "Segoe UI", Tahoma, sans-serif';
  context.fillStyle = "#0b66a1";
  const linkTextWidth = context.measureText(linkText).width;
  const linkY = panelY + panelHeight - 38;
  context.fillText(linkText, panelCenterX, linkY);

  context.lineWidth = 2;
  context.strokeStyle = "#0b66a1";
  context.beginPath();
  context.moveTo(panelCenterX - linkTextWidth / 2, linkY + 12);
  context.lineTo(panelCenterX + linkTextWidth / 2, linkY + 12);
  context.stroke();

  winLinkBounds.x = panelCenterX - linkTextWidth / 2 - 8;
  winLinkBounds.y = linkY - 16;
  winLinkBounds.width = linkTextWidth + 16;
  winLinkBounds.height = 32;

  context.fillStyle = "#4a6b80";
  context.font = '500 14px "Segoe UI", Tahoma, sans-serif';
  context.fillText("Click outside this box to keep playing", panelCenterX, panelY + panelHeight - 14);
  context.restore();
}

function getCanvasPointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function pointInRect(pointX, pointY, rect) {
  return (
    pointX >= rect.x &&
    pointX <= rect.x + rect.width &&
    pointY >= rect.y &&
    pointY <= rect.y + rect.height
  );
}

function handleWinOverlayPointer(event) {
  const pointer = getCanvasPointerPosition(event);

  if (pointInRect(pointer.x, pointer.y, winLinkBounds)) {
    window.open("https://www.charitywater.org/", "_blank", "noopener,noreferrer");
    return;
  }

  if (!pointInRect(pointer.x, pointer.y, winPanelBounds)) {
    resetAttemptState();
  }
}

function updateLevelTransition(deltaTimeInSeconds) {
  if (!isLevelTransitioning) {
    return;
  }

  transitionTimer += deltaTimeInSeconds;

  if (transitionTimer < transitionDuration) {
    return;
  }

  isLevelTransitioning = false;
  transitionTimer = 0;

  if (queuedLevel === null) {
    return;
  }

  currentLevel = queuedLevel;
  loadLevel(currentLevel);
  queuedLevel = null;
  resetAttemptState();
}

function applyAttemptVariance() {
  const rotationPercentOffset = randomSignedPercent(
    speedVariancePercentMin,
    speedVariancePercentMax
  );
  const powerPercentOffset = randomSignedPercent(
    speedVariancePercentMin,
    speedVariancePercentMax
  );

  const variedRotationSpeed = baseRotationSpeed * (1 + rotationPercentOffset);
  const variedPowerSpeed = basePowerSpeed * (1 + powerPercentOffset);

  setRotationSpeed(variedRotationSpeed);
  setPowerSpeed(variedPowerSpeed);
}

function randomizeTargetPosition() {
  const labelBottomPadding = 84;
  const safeMaxY = Math.max(targetMinY, Math.min(targetMaxY, canvas.height - targetArea.height - labelBottomPadding));

  targetArea.x = randomRange(targetMinX, targetMaxX);
  targetArea.y = randomRange(targetMinY, safeMaxY);
}

function loadLevel(levelNumber) {
  if (levelNumber !== 1 && levelNumber !== 2 && levelNumber !== 3) {
    return;
  }

  targetImage = levelTargetImages[levelNumber] || null;
  targetLabelLines = levelTargetLabels[levelNumber] || [];
  currentGoalGallons = levelGoalGallons[levelNumber] || 50;
  levelGallons = 0;

  if (levelNumber === 1) {
    // Level 1: close/easy setup with smaller single-house target and forgiving timing.
    cameraZoom = 1;
    targetIconStyle = "bucket";
    targetArea.width = 48;
    targetArea.height = 48;
    baseTargetX = canvas.width * 0.62;
    baseTargetY = canvas.height * 0.43;
    targetShiftRange = 3;
    setTargetRandomBounds(canvas.width * 0.28, canvas.width * 0.72, canvas.height * 0.14, canvas.height * 0.50);
    currentSplashMaxRadius = 55;
    currentSplashGrowthRate = 165;

    perfectZoneSize = 0.28;
    perfectZoneStart = 0.58;
    throwRandomness = 0.015;

    baseRotationSpeed = (45 * Math.PI) / 180;
    basePowerSpeed = 0.65;
    speedVariancePercentMin = 0.05;
    speedVariancePercentMax = 0.1;
  }

  if (levelNumber === 2) {
    // Level 2: medium setup with slightly larger town target and subtle variance.
    cameraZoom = 1;
    targetIconStyle = "town";
    targetArea.width = 72;
    targetArea.height = 50;
    baseTargetX = canvas.width * 0.67;
    baseTargetY = canvas.height * 0.30;
    targetShiftRange = 10;
    setTargetRandomBounds(canvas.width * 0.22, canvas.width * 0.78, canvas.height * 0.10, canvas.height * 0.48);
    currentSplashMaxRadius = 95;
    currentSplashGrowthRate = 210;

    perfectZoneSize = 0.18;
    perfectZoneStart = 0.64;
    throwRandomness = 0.03;

    baseRotationSpeed = (62 * Math.PI) / 180;
    basePowerSpeed = 0.9;
    speedVariancePercentMin = 0.05;
    speedVariancePercentMax = 0.1;
  }

  if (levelNumber === 3) {
    // Level 3: larger world target at top-center with fast timing and tight windows.
    cameraZoom = 1;
    targetIconStyle = "globe";
    targetArea.width = 520;
    targetArea.height = 300;
    baseTargetX = canvas.width / 2 - targetArea.width / 2;
    baseTargetY = canvas.height * 0.03;
    targetShiftRange = 0;
    setTargetRandomBounds(baseTargetX, baseTargetX, baseTargetY, baseTargetY);
    currentSplashMaxRadius = 520;
    currentSplashGrowthRate = 560;

    perfectZoneSize = 0.09;
    perfectZoneStart = 0.71;
    throwRandomness = 0.035;

    baseRotationSpeed = (96 * Math.PI) / 180;
    basePowerSpeed = 1.28;
    speedVariancePercentMin = 0.05;
    speedVariancePercentMax = 0.1;
  }

  applyAttemptVariance();
  randomizeTargetPosition();
}

function throwWater(angle, power) {
  const randomAngleOffset = (Math.random() * 2 - 1) * throwRandomness;
  const randomPowerOffset = (Math.random() * 2 - 1) * throwRandomness;
  const adjustedAngle = angle + randomAngleOffset;
  const adjustedPower = Math.min(1, Math.max(0, power + randomPowerOffset));
  const launchSpeed = 320 + adjustedPower * 980;
  const launchDistanceFromPivot = 26;

  droplet.isActive = true;
  droplet.x = launcherX + Math.sin(adjustedAngle) * launchDistanceFromPivot;
  droplet.y = launcherY - Math.cos(adjustedAngle) * launchDistanceFromPivot;
  droplet.vx = Math.sin(adjustedAngle) * launchSpeed;
  droplet.vy = -Math.cos(adjustedAngle) * launchSpeed;

  splash.isActive = false;
  splash.radius = 0;
}

function startSplash(x, y) {
  splash.isActive = true;
  splash.x = x;
  splash.y = y;
  splash.radius = 4;
  splash.maxRadius = currentSplashMaxRadius;
  splash.growthRate = currentSplashGrowthRate;
  splash.hasScored = false;
  splash.gallonsAwarded = 0;
}

function calculateTargetPixelsInsideCircle(circleX, circleY, radius) {
  const rectLeft = targetArea.x;
  const rectTop = targetArea.y;
  const rectRight = targetArea.x + targetArea.width;
  const rectBottom = targetArea.y + targetArea.height;

  const minX = Math.max(Math.ceil(rectLeft), Math.ceil(circleX - radius));
  const maxX = Math.min(Math.floor(rectRight - 1), Math.floor(circleX + radius));
  const minY = Math.max(Math.ceil(rectTop), Math.ceil(circleY - radius));
  const maxY = Math.min(Math.floor(rectBottom - 1), Math.floor(circleY + radius));

  if (minX > maxX || minY > maxY) {
    return 0;
  }

  const radiusSquared = radius * radius;
  let pixelsInside = 0;

  for (let y = minY; y <= maxY; y += 1) {
    const yFromCenter = y + 0.5 - circleY;
    const horizontalSquared = radiusSquared - yFromCenter * yFromCenter;

    if (horizontalSquared <= 0) {
      continue;
    }

    const horizontalReach = Math.sqrt(horizontalSquared);
    const rowMinX = Math.max(minX, Math.ceil(circleX - horizontalReach));
    const rowMaxX = Math.min(maxX, Math.floor(circleX + horizontalReach));

    if (rowMaxX >= rowMinX) {
      pixelsInside += rowMaxX - rowMinX + 1;
    }
  }

  return pixelsInside;
}

function processSplashScore() {
  if (!splash.isActive || splash.hasScored) {
    return;
  }

  const gallonsFromThisHit = calculateTargetPixelsInsideCircle(
    splash.x,
    splash.y,
    splash.maxRadius
  );

  splash.gallonsAwarded = gallonsFromThisHit;
  splash.hasScored = true;
  levelGallons += gallonsFromThisHit;
  totalGallons += gallonsFromThisHit;

  if (levelGallons < currentGoalGallons) {
    return;
  }

  startImpactText(currentLevel);

  if (currentLevel < maxLevel) {
    startLevelTransition(currentLevel + 1);
  } else {
    showWinScreen();
  }
}

function drawBackground() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#dff0ff";
  context.fillRect(0, 0, canvas.width, canvas.height);
}

function drawTargetArea() {
  context.fillStyle = "rgba(27, 128, 78, 0.20)";
  context.fillRect(targetArea.x, targetArea.y, targetArea.width, targetArea.height);
  context.strokeStyle = "#1b804e";
  context.lineWidth = 2;
  context.strokeRect(targetArea.x, targetArea.y, targetArea.width, targetArea.height);

  if (targetImage && targetImage.complete && targetImage.naturalWidth > 0) {
    drawImageContain(targetImage, targetArea.x, targetArea.y, targetArea.width, targetArea.height);
    drawTargetLabel();
    return;
  }

  if (targetIconStyle === "town") {
    const houseCount = 3;
    const spacing = targetArea.width / (houseCount + 1);
    const baseY = targetArea.y + targetArea.height * 0.72;

    for (let index = 0; index < houseCount; index += 1) {
      const centerX = targetArea.x + spacing * (index + 1);
      const houseWidth = targetArea.width * 0.19;
      const houseHeight = targetArea.height * 0.26;

      context.fillStyle = "#f3efe8";
      context.fillRect(centerX - houseWidth / 2, baseY - houseHeight, houseWidth, houseHeight);

      context.fillStyle = "#c96b5c";
      context.beginPath();
      context.moveTo(centerX - houseWidth / 2 - 2, baseY - houseHeight);
      context.lineTo(centerX, baseY - houseHeight - houseHeight * 0.7);
      context.lineTo(centerX + houseWidth / 2 + 2, baseY - houseHeight);
      context.closePath();
      context.fill();
    }

    return;
  }

  if (targetIconStyle === "globe") {
    const globeRadius = Math.min(targetArea.width, targetArea.height) * 0.34;
    const globeX = targetArea.x + targetArea.width / 2;
    const globeY = targetArea.y + targetArea.height / 2;

    context.fillStyle = "#4aa4d9";
    context.beginPath();
    context.arc(globeX, globeY, globeRadius, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = "#1e6f9f";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(globeX, globeY, globeRadius, 0, Math.PI * 2);
    context.stroke();

    context.strokeStyle = "rgba(12, 82, 122, 0.55)";
    context.lineWidth = 1.8;
    context.beginPath();
    context.arc(globeX, globeY, globeRadius * 0.65, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.ellipse(globeX, globeY, globeRadius, globeRadius * 0.45, 0, 0, Math.PI * 2);
    context.stroke();

    context.fillStyle = "rgba(59, 163, 102, 0.85)";
    context.beginPath();
    context.ellipse(globeX - globeRadius * 0.25, globeY - globeRadius * 0.12, globeRadius * 0.3, globeRadius * 0.2, 0.5, 0, Math.PI * 2);
    context.ellipse(globeX + globeRadius * 0.2, globeY + globeRadius * 0.18, globeRadius * 0.25, globeRadius * 0.16, -0.2, 0, Math.PI * 2);
    context.fill();

    return;
  }

  // Simple bucket icon for the target.
  const bucketWidth = targetArea.width * 0.38;
  const bucketHeight = targetArea.height * 0.48;
  const bucketX = targetArea.x + (targetArea.width - bucketWidth) / 2;
  const bucketY = targetArea.y + (targetArea.height - bucketHeight) / 2 + 8;

  context.fillStyle = "#5c8fb0";
  context.beginPath();
  context.moveTo(bucketX + 8, bucketY);
  context.lineTo(bucketX + bucketWidth - 8, bucketY);
  context.lineTo(bucketX + bucketWidth - 2, bucketY + bucketHeight);
  context.lineTo(bucketX + 2, bucketY + bucketHeight);
  context.closePath();
  context.fill();

  context.strokeStyle = "#2f5a75";
  context.lineWidth = 3;
  context.beginPath();
  context.arc(bucketX + bucketWidth / 2, bucketY + 4, bucketWidth / 2 - 6, Math.PI, 0);
  context.stroke();

  drawTargetLabel();
}

function drawTargetLabel() {
  if (!targetLabelLines.length) {
    return;
  }

  const lineHeight = 17;
  const labelY = targetArea.y + targetArea.height + 18;
  const labelX = targetArea.x + targetArea.width / 2;
  const paddingX = 10;
  const paddingY = 6;
  const fontSize = 14;

  context.save();
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `600 ${fontSize}px "Segoe UI", Tahoma, sans-serif`;

  let maxLineWidth = 0;
  for (let index = 0; index < targetLabelLines.length; index += 1) {
    const width = context.measureText(targetLabelLines[index]).width;
    maxLineWidth = Math.max(maxLineWidth, width);
  }

  const boxHeight = targetLabelLines.length * lineHeight + paddingY * 2;
  const boxTop = labelY - boxHeight / 2;

  context.fillStyle = "rgba(10, 40, 62, 0.7)";
  context.fillRect(
    labelX - maxLineWidth / 2 - paddingX,
    boxTop,
    maxLineWidth + paddingX * 2,
    boxHeight
  );

  context.fillStyle = "#ffffff";
  for (let index = 0; index < targetLabelLines.length; index += 1) {
    const lineY = boxTop + paddingY + lineHeight / 2 + index * lineHeight;
    context.fillText(targetLabelLines[index], labelX, lineY);
  }

  context.restore();
}

function drawLauncher() {
  const launcherRadius = 14 * cameraZoom;
  const standScale = clamp(0.9 + cameraZoom * 0.2, 0.95, 1.12);
  const standWidth = 64 * standScale;
  const standHeight = 18 * standScale;
  const standX = launcherX - standWidth / 2;
  const standY = launcherY + 8;
  const poleHeight = 58 * standScale;
  const poleWidth = 5 * standScale;
  const flagWidth = 118 * standScale;
  const flagHeight = 26 * standScale;
  const textScaleBoost = clamp(1 / cameraZoom, 1, 1.22);

  context.fillStyle = "#0f3b52";
  context.fillRect(standX, standY, standWidth, standHeight);

  context.fillStyle = "#1a5d80";
  context.fillRect(standX + standWidth * 0.15, standY - 2, standWidth * 0.7, 4 * standScale);

  const poleX = launcherX - standWidth * 0.18;
  const poleY = standY;
  context.fillStyle = "#194d6b";
  context.fillRect(poleX, poleY - poleHeight, poleWidth, poleHeight);

  const flagX = poleX + poleWidth;
  const flagY = poleY - poleHeight + 4 * standScale;
  context.fillStyle = "#ffd44d";
  context.beginPath();
  context.moveTo(flagX, flagY);
  context.lineTo(flagX + flagWidth, flagY);
  context.lineTo(flagX + flagWidth - 12 * standScale, flagY + flagHeight * 0.52);
  context.lineTo(flagX + flagWidth, flagY + flagHeight);
  context.lineTo(flagX, flagY + flagHeight);
  context.closePath();
  context.fill();

  const flagFontSize = 11 * standScale * textScaleBoost;
  context.fillStyle = "#0d3651";
  context.font = `600 ${flagFontSize}px "Segoe UI", Tahoma, sans-serif`;
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillText("charity: water", flagX + 8 * standScale, flagY + flagHeight / 2);

  context.fillStyle = "#27536f";
  context.beginPath();
  context.arc(launcherX, launcherY, launcherRadius, 0, Math.PI * 2);
  context.fill();

  context.save();
  context.translate(launcherX, launcherY);
  context.rotate(arrowAngle);

  context.strokeStyle = "#0d2a3d";
  context.lineWidth = 6;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(0, 0);
  context.lineTo(0, -110 * cameraZoom);
  context.stroke();

  context.fillStyle = "#0d2a3d";
  context.beginPath();
  context.moveTo(0, -130 * cameraZoom);
  context.lineTo(-10 * cameraZoom, -108 * cameraZoom);
  context.lineTo(10 * cameraZoom, -108 * cameraZoom);
  context.closePath();
  context.fill();

  context.restore();
}

function drawPowerBar() {
  context.fillStyle = "#ffffff";
  context.fillRect(powerBarX, powerBarY, powerBarWidth, powerBarHeight);

  context.fillStyle = "rgba(42, 166, 105, 0.35)";
  context.fillRect(
    powerBarX + powerBarWidth * perfectZoneStart,
    powerBarY,
    powerBarWidth * perfectZoneSize,
    powerBarHeight
  );

  context.fillStyle = "#2a7db9";
  context.fillRect(powerBarX, powerBarY, powerBarWidth * powerValue, powerBarHeight);

  context.strokeStyle = "#21445c";
  context.lineWidth = 2;
  context.strokeRect(powerBarX, powerBarY, powerBarWidth, powerBarHeight);
}

function drawScoreHud() {
  const hudX = 18;
  const hudY = 14;
  const hudWidth = 340;
  const hudHeight = 88;

  context.save();
  context.fillStyle = "rgba(9, 32, 48, 0.78)";
  context.fillRect(hudX, hudY, hudWidth, hudHeight);

  context.strokeStyle = "rgba(255, 255, 255, 0.35)";
  context.lineWidth = 1.5;
  context.strokeRect(hudX, hudY, hudWidth, hudHeight);

  context.fillStyle = "#ffffff";
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.font = '600 16px "Segoe UI", Tahoma, sans-serif';
  context.fillText(`Level ${currentLevel} Goal: ${currentGoalGallons.toLocaleString()} gal`, hudX + 12, hudY + 24);

  context.font = '700 20px "Segoe UI", Tahoma, sans-serif';
  const progressGallons = Math.min(levelGallons, currentGoalGallons);
  context.fillText(
    `Level Water: ${progressGallons.toLocaleString()} / ${currentGoalGallons.toLocaleString()} gal`,
    hudX + 12,
    hudY + 50
  );

  context.font = '500 14px "Segoe UI", Tahoma, sans-serif';
  context.fillText(`Total Water: ${totalGallons.toLocaleString()} gal`, hudX + 12, hudY + 72);
  context.restore();
}

function drawDroplet() {
  if (!droplet.isActive) {
    return;
  }

  context.fillStyle = "#2b9be7";
  context.beginPath();
  context.arc(droplet.x, droplet.y, droplet.radius, 0, Math.PI * 2);
  context.fill();
}

function drawSplash() {
  if (!splash.isActive) {
    return;
  }

  context.fillStyle = "rgba(43, 155, 231, 0.25)";
  context.beginPath();
  context.arc(splash.x, splash.y, splash.radius, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = "rgba(43, 155, 231, 0.9)";
  context.lineWidth = 3;
  context.beginPath();
  context.arc(splash.x, splash.y, splash.radius, 0, Math.PI * 2);
  context.stroke();
}

function updateArrow(deltaTimeInSeconds) {
  if (isAngleLocked || isLevelTransitioning || isGameWon) {
    return;
  }

  arrowAngle += swingDirection * rotationSpeed * deltaTimeInSeconds;

  if (arrowAngle >= maxAngle) {
    arrowAngle = maxAngle;
    swingDirection = -1;
  } else if (arrowAngle <= minAngle) {
    arrowAngle = minAngle;
    swingDirection = 1;
  }
}

function updatePower(deltaTimeInSeconds) {
  if (isPowerLocked || isLevelTransitioning || isGameWon) {
    return;
  }

  powerValue += powerDirection * powerSpeed * deltaTimeInSeconds;

  if (powerValue >= 1) {
    powerValue = 1;
    powerDirection = -1;
  } else if (powerValue <= 0) {
    powerValue = 0;
    powerDirection = 1;
  }
}

function isInsideTargetArea(x, y) {
  return (
    x >= targetArea.x &&
    x <= targetArea.x + targetArea.width &&
    y >= targetArea.y &&
    y <= targetArea.y + targetArea.height
  );
}

function updateDroplet(deltaTimeInSeconds) {
  if (!droplet.isActive || isGameWon) {
    return;
  }

  droplet.vy += gravity * deltaTimeInSeconds;
  droplet.x += droplet.vx * deltaTimeInSeconds;
  droplet.y += droplet.vy * deltaTimeInSeconds;

  if (isInsideTargetArea(droplet.x, droplet.y)) {
    droplet.isActive = false;
    startSplash(droplet.x, droplet.y);
    return;
  }

  const isOutOfBounds =
    droplet.x < -20 ||
    droplet.x > canvas.width + 20 ||
    droplet.y < -20 ||
    droplet.y > canvas.height + 20;

  if (isOutOfBounds) {
    droplet.isActive = false;
    startMissText();
  }
}

function updateSplash(deltaTimeInSeconds) {
  if (!splash.isActive) {
    return;
  }

  splash.radius += splash.growthRate * deltaTimeInSeconds;

  if (splash.radius >= splash.maxRadius) {
    processSplashScore();
    splash.isActive = false;
    splash.radius = 0;
  }
}

function gameLoop(timestamp) {
  const deltaTimeInSeconds = (timestamp - lastTimestamp) / 1000 || 0;
  lastTimestamp = timestamp;

  updateLevelTransition(deltaTimeInSeconds);
  updateImpactText(deltaTimeInSeconds);
  updateMissText(deltaTimeInSeconds);
  updateConfetti(deltaTimeInSeconds);
  updateArrow(deltaTimeInSeconds);
  updatePower(deltaTimeInSeconds);
  updateDroplet(deltaTimeInSeconds);
  updateSplash(deltaTimeInSeconds);
  drawBackground();

  context.save();
  context.translate(canvas.width / 2, canvas.height / 2);
  const cameraScale = getCameraScale();
  context.scale(cameraScale, cameraScale);
  context.translate(-canvas.width / 2, -canvas.height / 2);

  drawTargetArea();
  drawLauncher();
  drawDroplet();
  drawSplash();

  context.restore();

  drawPowerBar();
  drawScoreHud();
  drawConfetti();
  drawImpactText();
  drawMissText();
  drawWinScreen();

  requestAnimationFrame(gameLoop);
}

startButton.addEventListener("click", () => {
  if (isLevelTransitioning) {
    return;
  }

  resetToLevelOne();
});

function handlePrimaryAction() {
  if (isGameWon || isLevelTransitioning) {
    return;
  }

  if (inputPhase === "aim") {
    lockAngle();
    inputPhase = "power";
    return;
  }

  if (inputPhase === "power") {
    lockPower();
    inputPhase = "thrown";
    throwWater(arrowAngle, powerValue);
    return;
  }

  if (
    inputPhase === "thrown" &&
    !droplet.isActive &&
    !splash.isActive &&
    !impactText.isActive &&
    !missText.isActive
  ) {
    resetAttemptState();
  }
}

window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    handlePrimaryAction();
  }
});

canvas.addEventListener("pointerdown", (event) => {
  if (isGameWon) {
    event.preventDefault();
    handleWinOverlayPointer(event);
    return;
  }

  if (!mobileViewportQuery.matches) {
    return;
  }

  event.preventDefault();
  handlePrimaryAction();
});

loadLevel(1);
resetAttemptState();
requestAnimationFrame(gameLoop);
