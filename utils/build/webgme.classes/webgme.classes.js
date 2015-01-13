define('webgme.classes',
  [
    'client',
    'blob/BlobClient',
    'js/Utils/InterpreterManager',
    'core/core',
    'storage/clientstorage'
  ], function (Client, BlobClient, InterpreterManager,Core,Storage) {
    GME.classes.Client = Client;
    GME.classes.BlobClient = BlobClient;
    GME.classes.InterpreterManager = InterpreterManager;
    GME.classes.Core = Core;
    GME.classes.Storage = Storage;
  });
