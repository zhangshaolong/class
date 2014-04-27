/**
 * @file 面向对象实现继承，子类会自动继承父类的行为
 * @author：张少龙（zhangshaolong@baidu.com）
 */
var Class = function () {
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
    var Root;
    return Root = {
        enhance: false, // 是否是加强模式
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
                this.init && this.init.apply(this, arguments);
                if (Root.enhance) {
                    F.instances[this._uuid = F.uuid()] = this;
                }
            };
            if (parent) {
                noop.prototype = parent.prototype;
                F.prototype = new noop();
                noop.prototype = null;
            }
            for (var name in methods) {
                if (methods.hasOwnProperty(name)) {
                    var method = methods[name];
                    var override = false;
                    if (typeof method !== 'function') {
                        override = method.override;
                        method = method.handler;
                    }
                    F.prototype[name] = function(method, parentMethod, override) {
                        return function() {
                            !override && parentMethod
                                && parentMethod.apply(this, arguments);
                            return method.apply(this, arguments);
                        };
                    }(method, parent && parent.prototype[name], override);
                }
            }
            if (parent) {
                F.prototype.superClass = parent;
                F.prototype.constructor = F;
            }
            if (Class.enhance) {
                F.prototype.dispose = dispose;
            }
            F.create = Root.create;
            F.init = init;
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
}();