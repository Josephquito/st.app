import { HttpInterceptorFn } from '@angular/common/http';
import { todayISO } from '../utils/date.utils';

export const timezoneInterceptor: HttpInterceptorFn = (req, next) => {
  const cloned = req.clone({
    setHeaders: {
      'X-User-Date': todayISO(),
      'X-User-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });
  return next(cloned);
};
