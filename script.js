// ==UserScript==
// @name        Ignore low rep user questions
// @namespace   607407
// @include     /https?:\/\/(meta\.)?(stackoverflow|askubuntu|[a-z]+\.stackexchange)\.[a-z]{1,3}/.*?/
// @version     2015.12.18.17.54
// @author      http://stackoverflow.com/users/607407
// @grant       none
// ==/UserScript==

// Question will be completely hidden if the user reputation is smaller or equal to...
var HIDE_REP = 40;   // hiding using CSS class tagged-ignored-hidden
// Question will be de-emphasized if the user reputation is smaller or equal to...
var IGNORE_REP = 40;// Hiding using CSS class tagged-ignored
// Question is not penalized based on reputation if the vote score is greater or equal to...
var SHOW_VOTES = 1;
// What to do with questions tagged as interesting
//  Options:
//     "KEEP AS IS" - skip the question and take no actions on it
//     "TAG IGNORED" - never hide the question completely, just make it semi-transparent
//     "TREAT AS OTHERS" - do not check whether the question is or isn't interesting
var INTERESTING_QUESTIONS = "TREAT AS OTHERS";

// Some pesudoclass to simplify the code

function QuestionSummary(html) {
    if(html instanceof jQuery) {
      this.$ = html;
      this.elm = html[0];
    }
    else {
      this.$ = $(html);
      this.elm = html;
    }
}
defineHtmlGetterSetter(QuestionSummary.prototype, "reputation", ".reputation-score", {get: function(x) {return x.replace("k", "000").replace(/[^0-9]/g, "")*1;}});
defineHtmlGetterSetter(QuestionSummary.prototype, "score", ".vote-count-post strong");
defineHtmlGetterSetter(QuestionSummary.prototype, "title", ".question-hyperlink");

// Get a list of questions
var questions = $(".question-summary");

console.log("Score for ",questions.length," questions.");
//console.log(questions);

// This is deferred, so it runs AFTER the official script that marks the questions
function hideLowRepQuestions(questions) {
    console.log(questions);
    $.each(questions, function(index, summary) {
        //console.log(summary);
        var question = new QuestionSummary(summary);
        //question.elm.className = "question-summary";

        var is_interesting = INTERESTING_QUESTIONS=="TREAT AS OTHERS"?false:question.$.hasClass("tagged-interesting");
        if( question.score>=SHOW_VOTES || ( is_interesting && INTERESTING_QUESTIONS=="KEEP AS IS" ) ) {
          console.log("Question ", question.title, " has high score (or otherwise interesting) and thus is never ignored.");
          return;
        }
        if(question.$.hasClass("tagged-ignored-hidden")) {
          console.log("Question ", question.title, " already hidden.");
          return;
        }

        var rep = question.reputation;
        //console.log(question.score, question.title, question.reputation);

        // Second part of the condition is there to prevent accidental showing of a question

        if( rep <= HIDE_REP ) {
            if(is_interesting && INTERESTING_QUESTIONS=="TAG IGNORED") {
                question.$.addClass("tagged-ignored");
                console.log("Not hiding question ",question.title," because it's interesting.", question.$[0]);
            }
            else {
                question.$.addClass("tagged-ignored-hidden");
                console.log("Hiding question ",question.title,".", question.$[0]);
            }
        }
        else if( rep <= IGNORE_REP ) {
            question.$.addClass("tagged-ignored");
            console.log("Ignoring question ",question.title,".", question.$[0]);
        }
    });
}


// Wait till official stackexchange script starts modifying the class attributes:

// Shamelessly copied from https://developer.mozilla.org/en/docs/Web/API/Mutation
// I never use this anywhere else than userscripts, so I don't remember that
// select the target node

// You might think that this will only work when
// the first question summary is affected by tag filters
// but the truth is the class attribute is allways being set, even when the value would not change
// So this code allways triggers
var target = document.querySelector('.question-summary');

// create an observer instance
var observer = new MutationObserver(function(mutations) {
  mutations.forEach(function(mutation) {
     if(mutation.attributeName == "class") {
         hideLowRepQuestions(questions);
         // Class changed, nothing to wait for
         observer.disconnect();
     }
     //console.log(mutation.type, mutation.attributeName);
  });
});
hideLowRepQuestions(questions);
// configuration of the observer:
var config = { attributes: true, childList: false, characterData: false };
// pass in the target node, as well as the observer options

observer.observe(target, config);

/**
 * Creates getter and setter for innerHTML of HTML node got by selector disguised under property name.
 * this assumes `this.$` property (jQuery object of the actual HTML) and CACHES all selector results!
 * */
function defineHtmlGetterSetter(objectProto, name, selector, descriptor) {

    if(typeof descriptor=="undefined")
        descriptor = {};
    if(typeof descriptor.get!="function") {
        descriptor.get = function(x){return x;};
    }
    if(typeof descriptor.set!="function") {
        descriptor.set = function(x){return x;};
    }
    if(descriptor.nocache) {
        Object.defineProperty(objectProto, name, {
          get: function() {
            return descriptor.get(this.$.find(selector).html());
          },
          set: function(html) {
            return descriptor.set(cachedNode(this).html(html));
          },
        });
    }
    else {
        Object.defineProperty(objectProto, name, {
          get: function() {
            return descriptor.get(cachedNode(this).html());
          },
          set: function(html) {
            return descriptor.set(cachedNode(this).html(html));
          },
        });
        function cachedNode(instance) {
          return instance["_"+name+"_cached"] instanceof jQuery? instance["_"+name+"_cached"] : instance["_"+name+"_cached"]=instance.$.find(selector);
        }
    }
}
