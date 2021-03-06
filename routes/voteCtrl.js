/*
=================================================================
Modules regroupant les fonctions relative au système de vote
=================================================================
*/

// Importations des dépendances
var jwtUtils = require('../utils/jwt.utils');
var models = require('../models');
var asyncLib = require('async');


module.exports = { // Instanciation du module

  getVote: function (req, res) {  //  FONCTION de Récupération des données et rendu de la page VOTE

    var alertcookie = req.cookies.alert;
    var HeaderIco = req.cookies.HeaderIco;
    var HeaderUsername = req.cookies.HeaderUsername;
    var VoteActif = true;
    var idvoteencour = 0;
    var getvote1 = 0;
    var getvote2 = 0;
    var getvote3 = 0;
    var vote = 0;

    asyncLib.waterfall([ // Suite de fonction asynchrone (Waterfall)
      function (callback) { // Récupération de la dernière session de vote (LastID)
        models.VoteCount.findAll({
          limit: 1,
          order: [['createdAt', 'DESC']]
        }).then(function (LastId) {

          if (LastId[0] == undefined) {
            VoteActif = false;
          }
          else {
            idvoteencour = LastId[0].id;
          }
          callback(null);
        });
      },

      function (callback) { // Récupération des valeurs de la session de vote
        if (VoteActif == true) {
          models.VoteCount.findOne({
            where: { id: idvoteencour }
          })
            .then(function (VoteCount) {
              getvote1 = VoteCount["vote1"];
              getvote2 = VoteCount["vote2"];
              getvote3 = VoteCount["vote3"];
              callback(null, 'done');
            })
            .catch(function (err) {
              return res.status(400).cookie('alert', 'Erreur Serveur : Impossible d\'accéder à la base de donnée', { expires: new Date(Date.now() + 1000) })
                .redirect(301, '/passager/vote');
            });
        }
        else {
          callback(null, 'done');
        }
      },

    ], function (err, result) {  // Mise a jour des cookies regroupant les valeurs respectif des votes & Rendu de la page VOTE
      vote = [getvote1, getvote2, getvote3];
      var votesomme = vote[0] + vote[1] + vote[2];
      vote[0] = (100 * getvote1) / votesomme;
      vote[1] = (100 * getvote2) / votesomme;
      vote[2] = (100 * getvote3) / votesomme;
      res.clearCookie('vote1nbr');
      res.cookie('vote1nbr', vote[0], { expires: new Date(Date.now() + 1 * 3600000) });
      res.clearCookie('vote2nbr');
      res.cookie('vote2nbr', vote[1], { expires: new Date(Date.now() + 1 * 3600000) });
      res.clearCookie('vote3nbr');
      res.cookie('vote3nbr', vote[2], { expires: new Date(Date.now() + 1 * 3600000) });
      return res.render('vote', {
        alert: alertcookie, voteisactif: VoteActif, headerico: HeaderIco, headerusername: HeaderUsername,
        vote1: vote[0], vote2: vote[1], vote3: vote[2],
        vote1num: getvote1, vote2num: getvote2, vote3num: getvote3
      });
    });

  },
  updateVote: function (req, res) { // FONCTION de Mise a jour des votes après un vote
    var headerAuth = req.cookies.authorization;
    var userID = jwtUtils.getUserId(headerAuth);
    var vote1 = req.body.vote1;
    var vote2 = req.body.vote2;
    var vote3 = req.body.vote3;
    var globalvote1 = 0;
    var globalvote2 = 0;
    var globalvote3 = 0;
    var supp = false;


    if (userID < 0) { // Vérification de la connection
      return res.status(400).cookie('alert', 'Vous devez être connecté pour voter', { expires: new Date(Date.now() + 1000) })
        .redirect(301, '/passager/vote');
    }

    if (vote1 == null || vote2 == null || vote3 == null) { // Vérification des paramétres
      return res.status(400).cookie('alert', 'Il manque des paramétres', { expires: new Date(Date.now() + 1000) })
        .redirect(301, '/passager/vote');
    }


    asyncLib.waterfall([ // Suite de fonction asynchrone (Waterfall)
      function (callback) { //  Vérification du type d'utilisateur (Donateur / Non Donateur)
        models.User.findOne({
          attributes: ['isDonateur'],
          where: {
            id: userID
          }
        })
          .then(function (userlevel) {
            console.log(userlevel.isDonateur);
            if (userlevel['isDonateur'] == true) {
              supp = true;
            } else {
              supp = false;
            }
            callback(null);
          })
          .catch(function (err) {
            return res.status(400).cookie('alert', 'Erreur Serveur : Impossible d\'accéder à la base de donnée', { expires: new Date(Date.now() + 1000) })
              .redirect(req.get('referer'));
          });

      },
      function (callback) {
        models.Vote.findOne({ // Vérification pour évité qu'un même utilisateur vote deux fois.
          where: { userid: userID }
        })
          .then(function (userCheck) {
            callback(null, userCheck);
          })
          .catch(function (err) {
            return res.status(400).cookie('alert', 'Erreur Serveur : Impossible d\'accéder à la base de donnée', { expires: new Date(Date.now() + 1000) })
              .redirect(301, '/passager/vote');
          });
      },
      function (userCheck, callback) {
        if (userCheck != null) {
          return res.status(400).cookie('alert', 'Vous avez deja voté pour cette session de vote', { expires: new Date(Date.now() + 1000) })
            .redirect(301, '/passager/vote');
        }
        else {

          vote1 = vote1 | 0; // Traitement de type avec condition Binaire (Rendu INT Entier)
          vote2 = vote2 | 0;
          vote3 = vote3 | 0;

          if (vote1 > 1 || vote1 < 0) { //Traitement de Valeur
            vote1 = 0;
          }
          if (vote2 > 1 || vote2 < 0) {
            vote2 = 0;
          }
          if (vote3 > 1 || vote3 < 0) {
            vote3 = 0;
          }

          if (vote1 == 1) {  // Traitement des doublons
            vote2 = 0;
            vote3 = 0;
          }
          if (vote2 == 1) {
            vote1 = 0;
            vote3 = 0;
          }
          if (vote3 == 1) {
            vote1 = 0;
            vote2 = 0;
          }

          callback(null, callback);
        }
      },

      function (newVote, callback) { //Archivage du vote par utilisateur
        var CreateVote = models.Vote.create({
          userid: userID,
          vote1: vote1,
          vote2: vote2,
          vote3: vote3
        })
          .then(function (VoteCheck) {
            callback(null);
          })
          .catch(function (err) {
            return res.status(400).cookie('alert', 'Erreur Serveur : Impossible d\'accéder à la base de donnée', { expires: new Date(Date.now() + 1000) })
              .redirect(301, '/passager/vote');
          });
      },

      function (callback) {    // Ajout des votes dans les compteurs
        var VoteCount = models.VoteCount.findOne({
          where: { id: 1 }
        })
          .then(function (VoteCount) {

            globalvote1 = VoteCount["vote1"];
            globalvote2 = VoteCount["vote2"];
            globalvote3 = VoteCount["vote3"];

            if (supp == true) { /// Traitement du vote compte double du donateur
              vote1 = vote1 * 2;
              vote2 = vote2 * 2;
              vote3 = vote3 * 2;
            }


            globalvote1 += vote1;
            globalvote2 += vote2;
            globalvote3 += vote3;

            VoteCount.update({ // Mise a jour dans la base de donnée
              vote1: globalvote1,
              vote2: globalvote2,
              vote3: globalvote3

            }).then(function () {
              callback(null, 'done');
            }).catch(function (err) {
              return res.status(400).cookie('alert', 'Erreur Serveur : Impossible d\'accéder à la base de donnée', { expires: new Date(Date.now() + 1000) })
                .redirect(301, '/passager/vote');
            });
          })
          .catch(function (err) {
            return res.status(400).cookie('alert', 'Erreur Serveur : Impossible d\'accéder à la base de donnée', { expires: new Date(Date.now() + 1000) })
              .redirect(301, '/passager/vote');
          });
      },

    ], function (err, result) { // Refresh de la page 
      return res.status(400).redirect(301, '/passager/vote');
    });


  },

}


