/**
 * @file 面向对象实现继承，子类会自动继承父类的行为
 * @author：张少龙（zhangshaolongjj@163.com）
 */
(function (root, factory) {
    var clazz = factory();
    if (typeof define === 'function') {
        define(function() {
            return clazz;
        });
    } else {
        root.Class = clazz;
    }
})(this, function () {
    'use strict'
    /**
     * 空函数，用来为子类继承方法
     */
    var noop = function () {};
    /**
     * 获取某个类创建的所有对象，不包括已经销毁的对象
     * @return {array.instance} 返回类的实例集合
     */
    var all = function () {
        return this.instances;
    };
    /**
     * 查找某个类创建的对象
     * @private param {number} uuid 对象唯一标识
     * @return {instance} 返回类的指定实例
     */
    var find = function (uuid) {
        return this.instances[uuid];
    };
    /**
     * 移除某个类创建的对象
     * @private param {number} uuid 对象唯一标识
     */
    var remove = function (uuid) {
        delete this.instances[uuid];
    };
    /**
     * 对象销毁自身，即切断与创建此对象的类之间的关系，切断引用的父类
     */
    var dispose = function () {
        this.constructor.remove(this._uuid);
        this.superClass = null;
    };
    /**
     * 获取父类的方法
     */
    var getSuper = function (method) {
        var me = this;
        return function () {
            me.superClass.prototype[method].apply(me, arguments);
        };
    }
    /**
     * 唯一标识产生器
     * @return {number} 返回唯一标识
     */
    var uuid = function () {
        var uuid = 0;
        return function () {
            return ++uuid;
        };
    };
    /**
     * 类实例化对象的方法
     * @private param {object} options 实例化对象时的配置参数
     * @return {instance} 返回实例对象
     */
    var init = function (options) { // 暂时只支持1个参数
        return new this(options);
    };
    /**
     * 事件监听机制实现类，可使用on绑定事件
     * @return {object} 返回事件对象
     *               {object.on} 绑定事件接口（name，callback，context）
     *               {object.un} 注销事件接口（name，callback）
     *               {object.fire} 触发事件接口（name）
     */
    var Events = (function () {
        var slice = Array.prototype.slice;
        var Events = {
            on: function (name, callback, context) {
                if (!name || !callback) return false;
                this.events || (this.events = {});
                var evts = this.events[name] || (this.events[name] = []);
                var details = {callback: callback, context: context || this};
                evts.unshift(details);
                return details;
            },
            un: function (name, callback) {
                var type = typeof name;
                if(type === 'string'){
                    var evts = this.events[name],
                        len = evts.length;
                    var callType = typeof callback;
                    if ('undefined' === callType) {
                        this.events[name] = [];
                    } else if ('function' === callType) {
                        while(len--){
                            if(callback === evts[len].callback){
                                evts.splice(len, 1);
                            }
                        }
                    } else {
                        while (len--) {
                            if (callback === evts[len]) {
                                evts.splice(len, 1);
                            }
                        }
                    }
                }
                if (type === 'undefined') {
                    this.events = {};
                }
            },
            fire: function (name) {
                var evts = this.events[name],
                    len = evts.length;
                var args = slice.call(arguments, 1);
                while (len--) {
                    var evt = evts[len];
                    evt.callback.apply(evt.context, args);
                }
            }
        };
        return Events;
    })();
    var Root = {
        enhance: false, // 是否是加强模式
        eventable: false,
        /**
         * @param {methods}，{key} method名字，{value} method 或者 {object}
         * {methods}.{value}为{object}时，{object}结构
         *      {
         *          override: true,（可选）是否重写父类同名方法
         *          handler:  method
         *      }
         *  @return {Class的子类} 返回调用者的子类
         */
        create: function (Parent, methods) {
            var parent = null;
            if (Root !== this) {
                parent = this;
            }
            // 仅当是Root.create时，允许传入父类
            if (parent === null) {
                if (typeof Parent === 'function') {
                    parent = Parent;
                } else {
                    methods = Parent;
                    Parent = null;
                }
            } else if (!methods) {
                methods = Parent;
                Parent = null;
            }
            methods = methods || {};
            var F = function () {
                this.init.apply(this, arguments);
                if (Root.enhance) {
                    F.instances[this._uuid = F.uuid()] = this;
                }
            };
            if (parent) {
                noop.prototype = parent.prototype;
                F.prototype = new noop();
                noop.prototype = null;
            }
            F.prototype.init = function (options) {
                options = options || {};
                for(var p in options) {
                    this[p] = options[p];
                }
            };
            for (var name in methods) {
                if (methods.hasOwnProperty(name)) {
                    var method = methods[name];
                    var override = false;
                    if (typeof method !== 'function') {
                        override = method.override;
                        method = method.handler;
                    }
                    F.prototype[name] = function(method, pMethod, override) {
                        return function() {
                            !override && pMethod
                                && pMethod.apply(this, arguments);
                            return method.apply(this, arguments);
                        };
                    }(method, parent && parent.prototype[name], override);
                }
            }
            if (parent) {
                F.prototype.superClass = parent;
                F.prototype.constructor = F;
                F.prototype.getSuper = getSuper;
            }
            if (this.enhance) {
                F.prototype.dispose = dispose;
            }
            if (this.eventable) {
                F.prototype.on = Events.on;
                F.prototype.un = Events.un;
                F.prototype.fire = Events.fire;
            }
            F.create = Root.create;
            F.init = init;
            F.enhance = this.enhance;
            F.eventable = this.eventable;
            if (Root.enhance) {
                F.uuid = uuid();
                F.instances = {};
                F.all = all;
                F.find = find;
                F.remove = remove;
            }
            return F;
        }
    };
    return Root.create();
});