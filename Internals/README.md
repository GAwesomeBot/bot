# GAwesomeBot Internals

These files are crucial to the core functioning of GAB, you can call them the "engine" of GAB, if you will.

#### When do I modify Internals?
It is strongly recommended **to not edit any Internal files** for non-development purposes.
If you are strictly seeking customization, you should check out the files in the `/Configurations` folder instead.
*It is possible to edit the Constants.js file to modify some GAB behavior, but make sure you understand what you're doing first*.

#### How do I decide what files are Internals?
If a file;
* Is crucial to *all* functioning of GAB, or
* Is crucial to the functioning of another Internal file, or
* Extends and/or modifies the behavior of another Internal file, or
* Extends and utilises the Node Process, or
* Provides features to the Self Hoster and/or Developer that do not function stand-alone,

it is considered an Internal file.
Files that do not fit any of the above descriptions may still be considered an Internal file if no other folder serves as a better fit.
Some of the above functionality may be written in top-level files such as master.js or GAwesomeBot.js
