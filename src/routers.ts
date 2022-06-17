import { AuthModule } from './auth/AuthModule';
import { FileUploadModule } from './file-upload/file-upload.module';
import { VerifyModule } from './verify/VerifyModule';

export default () => {
  return [
    { path: '/auth', module: AuthModule },
    { path: '/file', module: FileUploadModule },
    { path: '/verify', module: VerifyModule },
  ];
};
