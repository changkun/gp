# Individual Projects

This document explains how to conduct your individual project, including
timeline, proposal writing suggestions, submission instructions, etc.

## Grading

The individual project contributes 50% of your final grade, and separated into two parts:

1. (10%) Write a project proposal before you start implementing it
2. (40%) Submit your code and give a 2~5 minutes presentation in video format

## Timeline

The timeline for individual projects are as follows:

| Submission        | Deadline            |
|:------------------|:-------------------:|
| Proposal Document | ~~01.01.2021 00:00:00~~ 15.01.2021 00:00:00 |
| Code              | 16.02.2021 00:00:00 |
| Video Demo        | 01.03.2021 00:00:00 |

Note that the individual project runs in parallel with the coding projects,
which means you can work on your individual project in parallel anytime (now)
but remember to submit corresponding files before the deadline.

## Requirements

It is required that your project is related to geometry processing topics, and topics outside this field may not be accepted (ask if you are not sure). For instance, replacing a human's face is a computer vision topic instead of geometry processing; Creating a model from scratch using 3D modeling software (e.g., Blender) is from 3D modeling instead of geometry processing.

Your project must be a programming project. We would _not_ provide any code skeleton as your starting point. This also implies that there are no constraints on what you can use (e.g., programming language, framework, tools, etc.). Pick the one that you can use most comfortably and efficiently. 

However, your project proposal must be subject to the given template (all sections must be filled in) in Markdown format.

Note that your proposal is accepted if and only if the document is merged
into this repository. Then you can (officially) start actively working on the implementation.
Therefore, we recommend you to start write and sent your proposal earlier for more feedbacks.

Whether you decided to use tools outside the teaching of this course in your project or not, you must provide reproducible compile instructions that allow others to run your program on a different machine (cross-platform compatibility is a plus not required here). Non-compilable code submission will not receive any points.

When you finished all of your implementations, you should start thinking about doing an excellent, compact presentation in a short video format. Your video presentation should not longer than 5 minutes, and 2 minutes is minimum and ideal. In your video presentation, you should focus on presenting your program's features and spend a reasonable amount of time to talk about your project implementation details. For instance, discuss the biggest challenge you have encountered, how you solved it,  where people can find the core feature's implementation, and why you organize the code in such a form.

## Proposal Template

_Proposals must be written in English._
To understand what you should write in a proposal document, please check this
[proposal template](./proposal-template.md).

## Folder Structure

You should create a folder named by your GitHub username, as an example,
there is an existing folder `changkun` demonstrates how to organize
all your files:

```
changkun              <-- Your GitHub username
├── proposal          <-- Folder for proposal related files
│   ├── assets        <-- Folder for all assets regarding the proposal
│   └── README.md     <-- The proposal document
└── src               <-- Folder for all of your code
    └── README.md     <-- The project README document, compile instructions etc.
```

Note that:

- If you are including an existing figure for your proposal from the Internet,
  you should use the original URL instead of including it in the `assets` folder.
- Do not commit any huge files (>100MB) to the repository, especially very big 3D models.
  It is recommended to provide instructions about where people can download it.
- Add a dedicated `.gitignore` file in your folder. If you don't know what
  `.gitignore` is, please check [here](https://github.com/github/gitignore)
  and get a template.

To submit your proposal and code, send [pull requests](https://github.com/mimuc/gp-ws2021/pulls) to the `master` branch.

## Questions?

[Submit an issue](https://github.com/mimuc/gp-ws2021/discussions/new).