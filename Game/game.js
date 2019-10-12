class Game {

  constructor(){

    // define canvas
  	this.canvas = document.getElementById("game_canvas");

  	// define canvas context
  	this.ctx = this.canvas.getContext("2d");

    // setting canvas context height and width for rendering
    this.ctx.canvas.width = CW;
    this.ctx.canvas.height = CH;

    // Various state index
    this.START_STATE    = 0;
    this.PLAY_STATE     = 1;
    this.GAMEOVER_STATE = 2;
    this.VICTORY_STATE  = 3;

    // variable to store
    this.CURRENT_STATE = this.PLAY_STATE;

    // state object array
    this.states = [
      new StartState(this),
      new PlayState(this),
      new GameOverState(this),
      new VictoryState(this)
    ];

    // Begin game loop with loop object instantiation
    this.gameLoop = new GameLoop(120.0,60.0,Utility.Now(),this.tick.bind(this));

  }

  setState(state){
    this.CURRENT_STATE = state;
  }

  // method that runs everytime game loop returns tick
  tick(deltaTime,shouldDraw){
    this.states[this.CURRENT_STATE].tick(deltaTime,shouldDraw);
  }

}

class GameLoop {


  constructor(sps,fps,lastTime,callBack){

      console.log(" > GAME LOOP Started. ");

      // this value represents the number of phsical updates per second
      this.sps = 1000.0 / sps;

      // fps as a value over 1 second ( 1000 miliseconds / '30' fps ) = 33.3 ms before next tick
      this.fps = 1000.0 / fps;

      // variable to store time of current tick
      this.now = lastTime;

      // variable to store time of last tick
      this.lastTime = lastTime;

      // call back to run on tick fire
      this.callBack = callBack;

      // tick total
      this.totalTick = 0;

      this.deltaTime = 0;

      // beginning tick method
      this.tick();

  }

  // recursive tick call back
  tick(){

    this.totalTick++;

    // getting current time
    this.now = Date.now();

    // setting delta as current time minus previous time in seconds
    this.deltaTime = (this.now - this.lastTime);

    // checking if delta time is greater then fps requirement
    if(this.deltaTime >= this.sps){

      // setting previous tick to the current tick time
      this.lastTime = this.now;

      // running callback with delta time
      if(typeof this.callBack == "function") {

        this.callBack(this.deltaTime/15,(this.deltaTime >= this.fps ? true : false));

      }

    }

    // requesting next frame
    window.requestAnimationFrame(this.tick.bind(this));

  }


}
