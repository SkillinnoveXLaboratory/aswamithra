import { AlertCircle, CheckCircle2, LoaderCircle, PackageOpen } from 'lucide-react';

export default function StateBlock({ type = 'empty', title, message, action }) {
  const Icon = type === 'loading' ? LoaderCircle : type === 'error' ? AlertCircle : type === 'success' ? CheckCircle2 : PackageOpen;
  return (
    <div className={`state-block state-${type}`}>
      <Icon className={type === 'loading' ? 'spin' : ''} size={32} />
      <h3>{title}</h3>
      {message ? <p>{message}</p> : null}
      {action}
    </div>
  );
}
