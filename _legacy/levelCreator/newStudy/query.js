db.match.aggregate([
  {
    $match: {
      puzzle: ObjectId("60e637fc7765e86e5cff88ef")
    }
  },
  {
    $lookup: {
      from: "puzzle",
      localField: "puzzle",
      foreignField: "_id",
      as: "puzzleData"
    }
  },
  {
    $unwind: "$puzzleData"
  },
  {
    $lookup: {
      from: "genome",
      localField: "puzzleData.target",
      foreignField: "_id",
      as: "targetGenome"
    }
  },
  {
    $unwind: "$targetGenome"
  },
  {
    $lookup: {
      from: "genome",
      localField: "puzzleData.mutable",
      foreignField: "_id",
      as: "mutableGenome"
    }
  },
  {
    $unwind: "$mutableGenome"
  },
  {
    $project: {
      _id: 1,
      moves: 1,
      restart: 1,
      level: 1,
      score: 1,
      topScore: 1,
      time: 1,
      points: 1,
      player: 1,
      currDiff: 1,
      genomePair: 1,
      sysTime: 1,

      "puzzleData._id": 1,
      "puzzleData.active": 1,
      "puzzleData.scores": 1,
      "puzzleData.topScore": 1,
      "puzzleData.created": 1,

      "targetGenome._id": 1,
      "targetGenome.geneBankId": 1,
      "targetGenome.name": 1,
      "targetGenome.sequence": 1,

      "mutableGenome._id": 1,
      "mutableGenome.geneBankId": 1,
      "mutableGenome.name": 1,
      "mutableGenome.sequence": 1
    }
  }
])