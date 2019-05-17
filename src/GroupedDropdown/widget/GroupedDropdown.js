/* global define, require, logger, mx, */
"use strict";

define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
    "dijit/_TemplatedMixin",

    "mxui/dom",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/dom-construct",
    "dojo/dom-class",
    "dojo/on",

    "dojo/text!GroupedDropdown/widget/template/GroupedDropdown.html"

    ],
    function (declare, _WidgetBase, _TemplatedMixin, mxDom, lang, dojoArray, domConstruct, domClass, on, template) {

    // Declare widget"s prototype.
    return declare("GroupedDropdown.widget.GroupedDropdown", [_WidgetBase, _TemplatedMixin], {

        //var widgetid = Math.floor(Math.random()*100000+1).toString(10);

        // Templated
        templateString: template,
        widgetid: '',
        _setWidgetidAttr: function(){
            //Parse the id into the template
            var id = Math.floor(Math.random()*100000+1);

            this.widgetid = "GroupedDropdown_"+id.toString(10);
            this.selectnode.id = this.widgetid+"_select";
            this.labelnode.htmlFor = this.widgetid+"_label";
            this.selectornode.id = this.widgetid;
            this.emptyvalue.value = this.widgetid+"_";
        },

        //Widget variables
        fieldLabel: '',              // label for the field
        optionEntity: '',            // entity to use as options, referenced from context.
        optionAttr: '',              // attribute of optionEntity to use as label
        optionXPath: '',
        groupEntity: '',             // entity to group options by, referenced from optionEntity.
        groupAttr: '',               // attribute of groupEntity to use as label
        labelWidth: 4,

        //Local variable
        _contextObj: null,          // Object in the dataview
        _optionIds: [],
        _options: {},
        _groupIds: [],
        _groups: {},

        //Local static
        postCreate: function () {
            logger.debug(this.id + ".postCreate");

            this._optionIds = [];
            this._options = {};
            this._groupIds = [];
            this._groups = {};

            this._optionReference = this.optionEntity.split("/")[0];
            this._optionEntity = this.optionEntity.split("/")[1];

            this._groupReference = this.groupEntity.split("/")[0];
            this._groupEntity = this.groupEntity.split("/")[1];

            this._setWidgetidAttr();

            this._renderLabel();
        },

        update: function (obj, callback) {
            // Don't really want to depend on context
            logger.debug(this.id + ".update");

            if(obj){
                this._contextObj = obj;
                this._resetSubscriptions();

                this._attrVisible = obj.has(this._optionReference);
                this._attrEditable = this._attrVisible && !obj.isReadonlyAttr(this._optionReference);

                this._getOptions(); // Always fetches all options and optgroups, regardless of readOnly setting.
            }

            if(callback){
                callback();
            }
        },

        uninitialize: function(){
            logger.debug(this.id + ".uninit");
            this._contextObj = null;
        },

        _resetSubscriptions: function () {
            logger.debug(this.id + "._resetSubscriptions");

            this.unsubscribeAll();

            if (this._contextObj) {
                this.subscribe({
                    guid: this._contextObj.getGuid(),
                    callback: lang.hitch(this, this._updateRendering)
                });


            this.subscribe({
                    guid: this._contextObj.getGuid(),
                    attr: this._optionReference,
                    callback: lang.hitch(this, this._updateRendering)
                });

            }
        },

        _getOptions: function(){

            var xpath = "//"+this._optionEntity+this.optionXPath; //Constrain?
            var callback = lang.hitch(this, this._processOptions);
            var filter = {};//attributes: [this.optionAttr], references:[this._groupReference]};

            mx.data.get({xpath: xpath, callback: callback, filter: filter});
        },

        _processOptions: function(options){

            dojoArray.forEach(options, function(option){
                this._optionIds.push(option.getGuid());
                this._options[option.getGuid()] = option;

                var group = option.get(this._groupReference);
                if(dojoArray.indexOf(this._groupIds, group) < 0){
                    this._groupIds.push(group);
                }

            }, this);


            var callback = lang.hitch(this, this._processGroups);
            var filter = {};//{attributes: [this.groupAttr]};

            mx.data.get({guids: this._groupIds, callback: callback, filter: filter});
        },

        _processGroups: function(groups){
            dojoArray.forEach(groups, function(group){
                this._groups[group.getGuid()] = group;
            }, this);


            this._render();
        },

        _render: function(){
            this._renderLabel();

            if(this._attrEditable){
                this._renderEditable();
            }
            else if(this._attrVisible){
                this._renderReadOnly();
            }
            else{
                this._renderNone();
            }
        },

        _renderNone: function(){
             if(this.selectnode){
                domConstruct.destroy(this.selectnode);
            }
            if(this.viewnode){
                domConstruct.destroy(this.viewnode);
            }
        },

        _renderLabel: function(){
            if(this.fieldLabel){
                domClass.add(this.labelnode, 'col-sm-'+this.labelWidth);
                domClass.add(this.selectornode, 'col-sm-'+(12-this.labelWidth));

                this.labelnode.innerHTML = this.fieldLabel;
            }
            else{
                domClass.add(this.selectornode, 'col-sm-'+12);
                this.labelnode.style.display = 'none';
            }
        },

        _renderReadOnly: function(){
            if(this.selectnode){
                domConstruct.destroy(this.selectnode);
            }
            this._updateRendering();
        },

        _renderEditable: function(){
            if(this.viewnode){
                domConstruct.destroy(this.viewnode);
            }

            var groupKeys = this._groupIds.sort();
            var optionKeys = this._optionIds.sort();

            dojoArray.forEach(groupKeys, function(groupKey){
                var groupNode = domConstruct.create("optgroup",
                        {label: this._groups[groupKey].get(this.groupAttr)
                        }, this.selectnode);

                var groupOptionKeys = dojoArray.filter(optionKeys, function(optionKey){
                    return this._options[optionKey].get(this._groupReference) == groupKey;
                }, this);

                dojoArray.forEach(groupOptionKeys, function(optionKey){
                    domConstruct.create("option",
                        {innerHTML: this._options[optionKey].get(this.optionAttr),
                            value: optionKey
                    }, groupNode);
                }, this);
            }, this);
            on(this.selectnode, "change", lang.hitch(this, this._setOption));
            this._updateRendering();
        },

        _updateRendering: function(){
            if(this._contextObj){
                var selected = this._contextObj.get(this._optionReference);

                if(this._attrEditable){
                    this.selectnode.value = selected; //Can selected ever be null or undefined?
                }
                else if (this._attrVisible){
                    var displayString = selected.length ? mxDom.escapeString(this._options[selected].get(this.optionAttr)) : "";
                    this.viewnode.innerHTML = displayString;
                }
            }
        },

        _setOption: function(event){
            var option = event.target.value;

            if(option != this._contextObj.get(this._optionReference)){
                this._contextObj.set(this._optionReference, option);
                if(this.onChangeMicroflow){
                    this._execMF(this._contextObj, this.onChangeMicroflow);
                }
            }
        },

        _execMF: function (obj, mf) {
            if (mf) {
                var params = {
                    applyto: "selection",
                    guids: []
                };
                if (obj) {
                    params.guids = [obj.getGuid()];
                }
                mx.ui.action(mf, {params: params}, this);
            }
        }

    });
});

require(["GroupedDropdown/widget/GroupedDropdown"]);
