/*!
 * Copyright(c) 2014 Sekawan Media
 * licensing@sekawanmedia.com
 * http://www.sekawanmedia.com/license
 */

/**
 * @class Ext.ux.application.ModuleConnector
 * <p>Connection to another Ext.app.Application class, so the app (hereinafter module) will be easy to load using `getModule` {@link getModule}</p>
 *
 * To use Ext Application as a Module there a two steps.
 * 1. Change your App into Class mode instead of Ext.application()
 *
 *      // original application
 *      Ext.application({
 *          name: 'somename',
 *          appFolder: 'someplace'
 *      });
 *
 *      // change into
 *      Ext.define('MODULE.SOMENAME.Module',{
 *          extend: 'Ext.app.Application',
 *          name: 'somename',
 *          appFolder: 'someplace'
 *      });
 *      // why using `MODULE.SOMENAME.Module` namespace?
 *      // Module name can be optional and whatever the name is.
 *
 * 2. After migrate application into class mode, then create connector extend Ext.ux.application.ModuleConnector,
 * and place it in same dir of the module (to make it easier on manage)
 *
 *      Ext.define('MODULE.SOMENAME.ModuleConnector', {
 *          extend: 'Ext.ux.application.ModuleConnector',
 *           
 *          singleton: true, // make it as singleton for easy use, but its optional
 *          module: {
 *              autoLoad: false,
 *              singleInstance: false, // set true if win
 *              className: 'MODULE.SOMENAME.Module', // here the module apply in
 *              namespace: 'VIEWER', // redeclare module namespace to keep the proper dir location
 *              styles:[
 *                  'MODULE.SOMENAME.resources.style' // have its custom stylesheet 
 *              ]
 *          }
 *      });
 *
 *      // then how to se it?
 *      MODULE.SOMENAME.ModuleConnector.getModule(function(module){
 *          // doing about the module here.
 *      });
 * 
 * @author Eko Dedy Purnomo <eko.dedy.purnomo@gmail.com>
 * @version 1.0.2
 */
Ext.define('Ext.ux.application.ModuleConnector', function(){
    var instances = Ext.create('Ext.util.MixedCollection') 
        getModuleFrom = function(instance){
            var module = null;
            if(instance && instance.getApplication && Ext.isFunction(instance.getApplication)){
                module = instance.getApplication();
            }else{
                module = instance;
            }
            return module;
        },
        registerModuleFrom = function(moduleName, registeredName){
            var instance = eval(moduleName);

            // make sure if instance is not created an instance
            if( Ext.isFunction(instance) ){
                instance = Ext.create(moduleName);
            }
            instances.add(registeredName, instance);
            return instance;
        };

    return {

        /**
         * @cfg {Object} module
         * The module (Ext.app.Application) config
         */
        module: {

            /**
             * @cfg {Array} styles
             * A set of css styles to be loaded, it should be a path within written in class mode
             *    
             *    styles: [
             *        'Module.moduleName.resources.style' // will be load module/moduleName/resources/style.css
             *    ]
             *     
             */
            styles: [],

            /**
             * @cfg {Array} requireModules
             * Another module connector to be loaded
             * @default true
             */
            requires: [],
            
            /**
             * @cfg {Boolean} autoLoad
             * Define if the module will be loaded on in pronto
             * @default true
             */
            autoLoad: false,
            
            /**
             * @cfg {String} className
             * Module class name to be loaded
             */
            className: null,

            /**
             * @cfg {String} appPath
             * Path of application to load the dependencies
             */
            appPath: null,

            /**
             * @cfg {String} appNamespace
             * Namespace to be registered in Ext, it for register appPath to Ext.Loader
             */
            appNamespace: null
        },

        constructor: function(){
            var me = this;
            me.callParent([arguments]);
            
            if(me.module.autoLoad){
                me.getModule();
            }
            // add module path
            if( !Ext.isEmpty(me.appNamespace) ){
                Ext.Loader.setPath(Object.prototype.toString.call(me.appNamespace), me.appPath);
            }
        },

        /**
         * retrieve the module its module config dinamically.
         * 
         * @param {Mixed} config    config to get module
         * config can be a Function and teh function will be set as callback (after module loaded)
         * config can be an Object
         * confg: {
         *     afterload: Function
         *     beforload: Function
         *     scope: Object
         * }
         * @param {Object} scope    scope to where the function will be called 
         */
        getModule: function(config){
            var $this = this,
                registeredName = Ext.getClassName(this),
                moduleConfig = this.module,
                instance = instances.get(registeredName),
                moduleClass = moduleConfig.className;

            if(Ext.isFunction(config)){
                config = {
                    afterload: config,
                    scope: arguments[1] || $this
                };
            }
            config = Ext.applyIf(config || {},{
                afterload: Ext.emptyFn,
                beforeload: Ext.emptyFn,
                scope: $this
            });

            Ext.callback(config.beforeload, config.scope);

            if( ! instance ){
                if( ! Ext.ClassManager.isCreated(moduleClass) ){

                    // using defer to avoid any stacked load
                    Ext.defer(function(){
                        Ext.Array.each(moduleConfig.styles, function(style){
                            Ext.util.CSS.createStyleSheet('@import url("'+(Ext.Loader.getPath(style)).replace(/.js$/,'.css')+( Ext.Loader.getConfig('disableCaching') && '?_dc='+Date.now())+'")');
                        });
                        var requires = Ext.Array.clone(Ext.Array.from(moduleConfig.requires));
                        requires.push(moduleClass);
                        Ext.require(requires, function(){
                            instance = registerModuleFrom(moduleClass, registeredName);
                            Ext.callback(config.afterload, config.scope, [getModuleFrom(instance)]);
                        });
                    }, 1);
                
                }else{
                    instance = registerModuleFrom(moduleClass, registeredName);
                    Ext.callback(config.afterload, config.scope, [getModuleFrom(instance)]);
                }   
            }else{
                Ext.callback(config.afterload, config.scope, [getModuleFrom(instance)]);
            }
        }
    }
});