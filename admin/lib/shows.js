/*global emit: false, start: false, log: false, getRow: false, send: false,
  $: false*/

var utils = require('./utils'),
    kanso_utils = require('kanso/utils'),
    admin_forms = require('./forms'),
    templates = require('kanso/templates');


var adminShow = function (fn) {
    return function (doc, req) {
        if (!req.client) {
            return templates.render('base.html', req, {
                title: 'Admin',
                content: templates.render('noscript.html', req, {})
            });
        }
        utils.getDesignDoc(req.query.app, function (err, ddoc) {
            if (err) {
                return alert(err);
            }
            fn(doc, ddoc, req);
        });
    }
};

exports.types = adminShow(function (doc, ddoc, req) {
    var settings = utils.appRequire(ddoc, 'kanso/settings');
    var app = utils.appRequire(ddoc, settings.load);

    var types = [];
    if (app.types) {
        for (var k in app.types) {
            if (app.types.hasOwnProperty(k)) {
                types.push(k);
            }
        }
    }

    var res = {code: 200, headers: {'Content-Type': 'text/html'}};

    var content = templates.render('types.html', req, {
        types: types,
        app: settings.name,
        app_heading: utils.capitalize(settings.name)
    });

    if (req.client) {
        $('#content').html(content);
        document.title = settings.name + ' - Types';
    }
    else {
        res.body = templates.render('base.html', req, {
            title: settings.name + ' - Types',
            content: content
        });
    }

    return res;
});

exports.addtype = adminShow(function (doc, ddoc, req) {
    var settings = utils.appRequire(ddoc, 'kanso/settings'),
        app = utils.appRequire(ddoc, settings.load),
        type = app.types ? app.types[req.query.type]: undefined;

    var forms = utils.appRequire(ddoc, 'kanso/forms'),
        form = new forms.Form(type);

    if (req.method === 'POST') {
        form.validate(req);
    }
    var content = templates.render('add_type.html', req, {
        app: req.query.app,
        app_heading: utils.capitalize(req.query.app),
        type: req.query.type,
        type_heading: utils.typeHeading(req.query.type),
        form: form.toHTML(req, forms.render.table)
    });
    $('#content').html(content);
    document.title = settings.name + ' - Types - ' + req.query.type;
    admin_forms.bind(req);
});

exports.edittype = adminShow(function (doc, ddoc, req) {
    var settings = utils.appRequire(ddoc, 'kanso/settings'),
        app = utils.appRequire(ddoc, settings.load),
        type = app.types ? app.types[doc.type]: undefined;

    var forms = utils.appRequire(ddoc, 'kanso/forms'),
        form = new forms.Form(type, doc);

    var content = templates.render('edit_type.html', req, {
        app: req.query.app,
        app_heading: utils.capitalize(req.query.app),
        type: doc.type,
        type_heading: utils.typeHeading(doc.type),
        id: req.query.id,
        form: form.toHTML(req, forms.render.table)
    });

    $('#content').html(content);
    document.title = settings.name + ' - Types - ' + doc.type;
    admin_forms.bind(req);
});

exports.fieldPairs = function (fields, doc, path) {
    var pairs = [];
    for (var k in fields) {
        if (fields.hasOwnProperty(k)) {
            if (kanso_utils.constructorName(fields[k]) === 'Field') {
                var val = kanso_utils.getPropertyPath(doc, path.concat([k]));
                if (!fields[k].isEmpty(val) || !fields[k].omit_empty) {
                    pairs.push({
                    field: path.concat([k]).join('.'),
                        value: val
                    });
                }
            }
            else if (kanso_utils.constructorName(fields[k]) === 'Embedded') {
                pairs = pairs.concat(
                    exports.fieldPairs(
                        fields[k].type.fields, doc, path.concat([k])
                    )
                );
            }
            else if (kanso_utils.constructorName(fields[k]) === 'EmbeddedList') {
                var items = kanso_utils.getPropertyPath(doc, path.concat([k]));
                if (items) {
                    for (var i = 0; i < items.length; i++) {
                        pairs = pairs.concat(
                            exports.fieldPairs(
                                fields[k].type.fields, doc, path.concat([k,i])
                            )
                        );
                    }
                }
                else {
                    if (!fields[k].omit_empty) {
                        pairs.push({field: path.concat([k]).join('.'), value: ''});
                    }
                }
            }
            else if (typeof fields[k] === 'object') {
                pairs = pairs.concat(
                    exports.fieldPairs(fields[k], doc, path.concat([k]))
                );
            }
        }
    }
    return pairs;
};


exports.viewtype = adminShow(function (doc, ddoc, req) {
    var settings = utils.appRequire(ddoc, 'kanso/settings'),
        fields = utils.appRequire(ddoc, 'kanso/fields'),
        app = utils.appRequire(ddoc, settings.load),
        type = app.types ? app.types[doc.type]: undefined;

    var content = templates.render('viewtype.html', req, {
        fields: exports.fieldPairs(type.fields, doc, []),
        doc: doc,
        app: req.query.app,
        app_heading: utils.capitalize(req.query.app),
        type: doc.type,
        type_plural: utils.typePlural(doc.type),
        type_heading: utils.typeHeading(doc.type)
    });

    var title = req.query.app + ' - ' + doc.type + ' - ' + req.query.id;
    $('#content').html(content);
    document.title = title;
});
