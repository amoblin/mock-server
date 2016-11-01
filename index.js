#!/usr/bin/env node
/****************************************************************************
* -*- coding:utf-8 -*-
* filename: api.js
* description: TODO
* create date: 2015-11-17 13:45:47
* author: amoblin
****************************************************************************/

const express = require('express'),
    app = express(),
    url = require('url'),
    bodyParser = require('body-parser'),
    util = require('util'),
    path = require('path'),
    fs = require('fs'),
    shell = require('shelljs'),
    request = require('request-promise');

const host = "http://www.demo.com",
    title = "接口文档",
    group = "Group 1";

const blueprint_head = util.format("FORMAT: 1A\nHOST: %s\n\n# %s\n\n# Group %s\n\n", host, title, group)

const blueprint_path  = "## %s [%s]\n\nLive Demo: <%s>\n\n"

const blueprint_method = "### %s [%s]\n+ Response 200 (application/json)\n+ Body\n\n%s\n\n"

const doc_content = blueprint_head;

app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));

app.get('/', function(req, res) {
    console.log(req.url);
    res.sendFile(path.join(__dirname, "./api-doc/index.html"));
});

const ROOT = "http://news-at.zhihu.com"
const PREFIX = ""

const add = (desc, path, callback, uri) => {
    get(desc, path, callback, uri);
    post(desc, path, callback, uri);
    doc(desc, path, uri);
};

const post = (desc, path, callback, uri) => {
    if (uri === undefined) {
        uri = util.format("%s/%s", PREFIX, path);
    }
    if (callback === undefined || callback === null) {
        const content = require(util.format("./mock-data/%s.json", path));
        app.post(uri, function(req, res) {
            console.log(req.url);
            res.json(content)
        })
    } else {
        app.post(uri, function(req, res) {
            callback(req, res);
        });
    }
}

const get = (desc, path, callback, uri) => {
    if (uri === undefined) {
        uri = util.format("%s/%s", PREFIX, path);
    }
    if (callback === undefined || callback === null) {
        const content = require(util.format("./mock-data/%s.json", path));
        app.get(uri, function(req, res) {
            console.log(req.url);
            res.json(content)
        })
    } else {
//        console.log("register with function for path: %s", uri);
        app.get(uri, function(req, res) {
            callback(req, res);
        });
    }
}

const doc = (desc, path, uri) => {
    if (uri === undefined) {
        uri = util.format("%s/%s", PREFIX, path);
    }
    
//    let content = basic_md(desc, uri);
    let content = blueprint_uri(desc, uri);
    let doc_content = util.format("%s%s", doc_content, content);

    content = blueprint_action(desc, "POST", "");
    doc_content = util.format("%s%s", doc_content, content);
}

const basic_md = (desc, uri) => {
    return util.format("\n- %s <%s>", desc, uri);
}

const blueprint_uri = (desc, uri) => {
    const url = util.format("%s%s", ROOT, uri);
    return util.format(blueprint_path, desc, uri, url);
}

const blueprint_action = (desc, method, content) => {
    return util.format(blueprint_method, desc, method, content);
}

app.use(function(err, req, res, next) {
    console.error(err.stack);
    res.send(500, 'Something broke!');
});

const start = () => {
    fs.writeFile("api-doc/api.apib", doc_content, function(err) {
        if(err) {
            return console.log(err);
        }
//        console.log("The file was saved!");
    }); 

    app.use(function(req, res, next) {
        const uri = path.join(PREFIX, req.url);
        let filePath = path.join("./mock-data", uri);
        filePath = util.format("./%s.json", filePath);
        console.log(filePath);
        if (fs.existsSync(filePath)) {
            const content = require(filePath);
            res.json(content);
        } else {
            const url = util.format("%s%s", ROOT, uri);
            console.log(url);
            request(url).then(response => {
                shell.mkdir('-p', path.dirname(filePath));
                fs.writeFile(filePath, response, err => {
                    if (err) {
                        console.log(err);
                    }
                })
                return JSON.parse(response);
            }).then(data => {
                res.json(data);
            }).catch(error => {
                console.log(error);
                res.redirect("/");
            })
        }
    });

    const server = app.listen(4000, function () {
        const host = server.address().address
        const port = server.address().port
        console.log('Example app listening at http://%s:%s', host, port)
    })
}

start();
