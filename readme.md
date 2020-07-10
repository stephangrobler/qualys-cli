Qualys-CLI
==========

* Note: This is a work in progress and should only be used AS INSTRUCTED

Install
-------
* Extract files into folder
* Ensure you have nodejs installed
* in the console, run: `npm install`

Authentication:
---------------

If you run the first time, it will automatically ask you to login. The API uri is the one specified by the Qualys documentation to use.

Commands:
---------

To run any command you start by typing: `node index.js` followed by the a command below

* `add-tag-to-hosts`
  * adds a searched for tag to all hosting matching a string that is contained in a host ids e.g. "1283874293,198273912,12987449283" and an exact tag name e.g. "DD I&T"
  * --tagToAdd="ExactTagName"
  * --hostIds="CommaSeparatedListOfIds"