Qualys-CLI
==========

* Note: This is a work in progress and should only be used AS INSTRUCTED

Install
-------
* Extract files into folder
* Ensure you have nodejs installed
* in the console, run: `npm install`

Commands:
*****
To run any command you start by typing: `node index.js` followed by the a command below



* `add-tag-to-hosts`
  * adds a searched for tag to all hosting matching a string that is contained in a host name e.g. "ZABR" and an exact tag name e.g. "DD I&T"
  * --tagToAdd="ExactTagName"
  * --searchTag="ExactTagToBeOnHost"
  * --searchHostName="StringThatIsPartOfHostName"