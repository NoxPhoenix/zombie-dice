import inquirer from 'inquirer';
import _ from 'lodash';

const winingScore = 13;

const gameState = {};

const createScoreOutput = (gameState) => {
  const formatScore = (playerName, score) => `${playerName}: ${score}`;
  return gameState.turnOrder.map((player) => formatScore(player, gameState[player]));
};

const resetConsole = () => {
  console.clear();
  console.log(createScoreOutput(gameState).join(' '));
  console.log(`Current turn: ${gameState.turnOrder[gameState.currentTurn]}`)
};

const symbols = {
  gun: '🔫',
  brain: '🧠',
  run: '🏃',
  green: '🟩',
  yellow: '🟨',
  red: '🟥',
};

const diceTypes = {
  redDie: ['gun', 'gun', 'gun', 'run', 'run', 'brain'],
  yellowDie: ['gun', 'run', 'brain'],
  greenDie: ['brain', 'brain', 'brain', 'run', 'run', 'gun'],
}

const defaultDiceBag = [
  'green',
  'green',
  'green',
  'green',
  'green',
  'green',
  'yellow',
  'yellow',
  'yellow',
  'yellow',
  'red',
  'red',
]

const possiblePlayers = [
  'Ben',
  'Velcro',
  'Mitch',
  'Mark',
  'McCall'
]

const getPlayers = () => inquirer.prompt([{
  type: 'checkbox',
  name: 'players',
  message: 'Who is playing?',
  choices: possiblePlayers,
}]);

const getFirst = (players) => inquirer.prompt([{
  type: 'list',
  name: 'first',
  message: 'Who is first?',
  choices: players,
}]);

const roll = (dice) => {
  return dice.map(die => ({
    color: die,
    result: _(diceTypes[`${die}Die`])
      .shuffle()
      .first()
    })
  )
};

const drawDice = (diceBag = defaultDiceBag, amountToDraw = 3) => {
  return { 
    drawnDice: _(diceBag)
      .shuffle()
      .take(amountToDraw)
      .value(),
    newDiceBag: _.drop(diceBag, amountToDraw),
  };
};

const rollTurn = async (dice) => {
  const results = roll(dice)

  return {
    rawResults: results,
    score: {
      brains: _.without(results.map(({ result }) => result), 'run', 'gun').length,
      guns: _.without(results.map(({ result }) => result), 'run', 'brain').length,
    },
    diceUsed: _.without(results.map(({ color }) => color), 'run'),
    remainingRuns: _(results)
      .map(({ result, color }) => {
        if (result === 'run') return color;
      })
      .compact()
      .value(),
  }
}

const takeTurn = async (playerName) => {
  const turnState = {
    brains: 0,
    guns: 0,
    diceLeftFromPreviousRoll: [],
    diceUsed: [],
    diceBag: defaultDiceBag,
  };

  const resetPrints = (logCurrent) => {
    resetConsole();
    if(logCurrent) console.log('This turn', ..._.times(turnState.brains, () => symbols.brain), ' ', ..._.times(turnState.guns, () => symbols.gun))
    console.log(' ');
  };

  while (turnState.guns < 3) {
    resetPrints((turnState.brains > 0 || turnState.guns > 0) );
    const amountToDraw = 3 - turnState.diceLeftFromPreviousRoll.length;
    if (amountToDraw > turnState.diceBag.length) {
      turnState.diceBag = [...turnState.diceBag, ...turnState.diceUsed];
      turnState.diceUsed = [];
    }
    const { drawnDice, newDiceBag } = drawDice(turnState.diceBag, amountToDraw);
    turnState.diceBag = newDiceBag;
    const diceToRoll = [...turnState.diceLeftFromPreviousRoll, ...drawnDice];
    if (turnState.diceLeftFromPreviousRoll.length) {
      console.log('You have the following dice left from last turn...');
      console.log(...turnState.diceLeftFromPreviousRoll.map((color) => symbols[color]))
    }
    console.log('You pulled...');
    console.log(...drawnDice.map(die => symbols[die]));
    await inquirer.prompt([{
      type: 'confirm',
      message: 'Ready to roll?',
      name: 'confirmRoll'
    }]);
    const rollResult = await rollTurn(diceToRoll);
    turnState.brains += rollResult.score.brains;
    turnState.guns += rollResult.score.guns;
    turnState.diceLeftFromPreviousRoll = rollResult.remainingRuns;
    turnState.diceUsed = _.concat(turnState.diceUsed, rollResult.diceUsed);
    resetPrints((turnState.brains > 0 || turnState.guns > 0) );
    const resultColors = rollResult.rawResults.map(({ color }) => symbols[color]);
    const resultSymbols = rollResult.rawResults.map(({ result }) => symbols[result]);
    console.log('You rolled...');
    console.log(...resultColors);
    console.log(...resultSymbols);
    if (turnState.guns < 3) {
      const { continue: bankResponse } = await inquirer.prompt([{
        type: 'list',
        name: 'continue',
        message: 'Bank, or keep going?',
        choices: ['Risk it!', 'Bank'],
      }]);
      
      if (bankResponse === 'Bank') {
        gameState[playerName] += turnState.brains
        turnState.guns = 3;
      }
    }
  }
};

const gameManager = async () => {
  const players = await getPlayers()
    .then(({ players }) => players);
  players.map((player) => gameState[player] = 0)
  gameState.turnOrder = _.shuffle(players);
  gameState.currentTurn = 0;
  let gameEnd = false;
  let highestScore = 0;
  while (gameEnd === false) {
    if (gameState.currentTurn === players.length) gameState.currentTurn = 0
    await inquirer.prompt([{
      type: 'confirm',
      name: 'currentTurn',
      message: `It is ${gameState.turnOrder[gameState.currentTurn]}'s turn.`
    }])
    await takeTurn(gameState.turnOrder[gameState.currentTurn])
    gameState.currentTurn++;
    highestScore = _.max(players.map((player) => gameState[player]));
    if (highestScore > winingScore && gameState.currentTurn === (players.length -1)) gameEnd = true;
  }
  console.log('final scores');
  console.log(gameState);
};

gameManager();