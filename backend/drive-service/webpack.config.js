module.exports = function (options, webpack) {
    return {
      ...options,
      watchOptions: {
        aggregateTimeout: 300,
         poll: 500, // Cứ mỗi 500ms sẽ quét file một lần để tìm thay đổi
        ignored: /node_modules/,
      },
    };
  };