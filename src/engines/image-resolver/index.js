const {
  resolveProductImage,
} = require('../product-images');

/**
 * Image Resolver Facade
 *
 * - Encapsula o image engine novo
 * - Não conhece legacy
 * - Mantém contrato único
 */
module.exports = {
  resolveProductImage,
};
