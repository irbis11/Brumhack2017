class State {

  constructor(type){

    this.type = type;

    this.state = null;

  }

  getType(){
    return this.type;
  }

  setType(type){
    this.type = type;
  }

  update(deltaTime){

  }

  addData(key,value){
    state[key] = value;
  }

}

class PlayState {

  constructor(){

    // defining world object
    this.world = new World(5000,5000);

  }

  tick(deltaTime,shouldDraw){

    // updating and updating world
    this.world.update(deltaTime);

    if(shouldDraw)
      this.world.draw();

  }

}
