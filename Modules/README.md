# GAwesomeBot Modules

GAwesomeBot Modules are snippets of codes that either act as utilities to aid in development, or as stand-alone features that perform actions on their own.

#### When do I modify Modules?
A Module should only be edited if you wish to change the functionality of said Module. In general, **Utils should not be edited** for non-development purposes.
If you are strictly seeking customization, you should check out the files in the `/Configurations` folder instead.

#### How do I decide what files are Modules?
If a file contains *one* function, class, and/or namespace containing only functions about the same feature, a file would classify as a Module.
If a GAB feature is too large for one Module, a folder may be created to contain multiple files for that Module instead.
If you simply wish to store a snippet of code that is often used, it should be a Util.
Files that do not fit any of the above descriptions may still be considered a Module if no other folder serves as a better fit.
Some of the above functionality may be written in top-level files such as master.js or GAwesomeBot.js
