/**
 * 文件说明: 将wx.*()函数Promise化
 * 相关资料: https://segmentfault.com/a/1190000013150196
 * 作者: xianyuxmu
 */
var Promise = require('./pinkie.js');

module.exports = (api) => {
    return (options, ...params) => {
        return new Promise((resolve, reject) => {
            api(Object.assign({}, options, { success: resolve, fail: reject }), ...params);
        });
    }
}