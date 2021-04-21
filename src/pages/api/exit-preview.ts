/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default async (_: any, res: any): Promise<any> => {
  res.clearPreviewData();

  res.writeHead(307, { Location: '/' });
  return res.end();
};
