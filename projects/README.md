# Individual Projects

Individual projects are evaluated by the following five parts:

- (10%) Proposal document, idea-pitch presentation (1 minute)
- (10%) Intermediate presentation (5 minutes)
- (10%) Video submission (<5 minutes)
- (10%) Final presentation (10 minutes)
- (10%) Code submission

## Project Proposal

A project proposal is the first step of conducting an individual project.
A proposed project topic must be in the geometry processing field, and any topics outside this field may not be accepted. For instance, replacing a human's face is a computer vision topic instead of geometry processing; Creating a model from scratch manually using a 3D modeling software (e.g., Blender) is not part of the focus of geometry processing.

A project must be a coding project. There is _no_ provided skeleton or template as starting point. This also implies that there are no constraints on the facility, such as programming language, framework, tools, software, etc. Pick the one that most comfortably and efficiently to use.

_Proposals must be written in English._ There is a [proposal template](./proposal-template.md) to fill.

Before proceeding to the implementation phase, a proposal must be accepted. After each course session, there will be a _call for comments_ discussion to discuss any project ideas. All participants can vote for the acceptance of the project.

When a proposal is accepted, one should submit the proposal document by a [pull requests](https://github.com/mimuc/gp/pulls). To organize the project files, see [Folder Structure](#folder-structure) section.

## Presentations

- An idea-pitch presentation is to present the core idea or functionality of the project. Each idea-pitch presentation should not spend longer than 1 minute.
- An intermediate presentation is to present the progress the project. Each presentation should not spend longer than 5 minute.
- An final presentation is to present everything about the project. Each presentation should not spend longer than 10 minute.

One should submit the idea-pitch presentation slides by a [pull requests](https://github.com/mimuc/gp/pulls). To organize the project files, see [Folder Structure](#folder-structure) section.

## Video Submission

A video submission serves as a teaser of the project, and should have 120 seconds approximately, but strictly limited up to 5 minutes.
In the video, one should give a brief introduction to the project background, achievements (features) and interesting insights during the development.

In the video, one should focus on presenting program's features, implementation details, and etc. For instance, discuss the biggest challenge encountered, how it was solved, where people can find the core feature's implementation.

To submit a video, there are multiple ways of doing it:

1. Upload to GitHub, see instructions [here](https://github.blog/2021-05-13-video-uploads-available-github/).
2. Upload to YouTube, see instructions [here](https://www.youtube.com/watch?v=6C4dEpT0rYg) (an additional Google account may needed).
3. Other possible way (such as upload to a self-hosted server) are also accepted.

The video submission must be downloadable and accept possible future demonstration usage in the course.

## Code Submission

A code submission must contain a detailed README file that documents the steps of usage, such as the necessary steps to compile and run the project.

To submit the code, send a [pull requests](https://github.com/mimuc/gp/pulls), similar the process of submitting a homework project. To organize the project files, see [Folder Structure](#folder-structure) section.

Note that a code submission will be open sourced under GPLv3 license.
To apply the code license appropriately, add the following paragraph
to the head of all files of the project:

```
Copyright (c) 2021 LMU Munich Geometry Processing Authors. All rights reserved.
Created by YourName <email-or-website>.

Use of this source code is governed by a GNU GPLv3 license that can be found
in the LICENSE file.
```

See an example [here](../1-halfedge/src/main.ts).

### Folder Structure

To organize all files of an individual project, please follow the following structure:

```
projects
├── proposal-template.md
├── changkun             <-- Github username
│   ├── README.md        <-- Project usage instructions
│   ├── assets           <-- Non-code assets
│   ├── proposal         <-- Proposal documents
│   ├── src              <-- Project source code
│   └── talks            <-- Presentations
└── README.md            <-- This document
```

Note that:

- Do not add any huge files (>50MB) to the repository, especially very big 3D models. It is recommended to provide instructions about where people can download it.
- Add a dedicated `.gitignore` file in the project folder, check [here](https://github.com/github/gitignore) to get a gitignore template.

## License

Copyright &copy; 2020-2022 LMU Munich Media Informatics Group by [Changkun Ou](https://changkun.de).
