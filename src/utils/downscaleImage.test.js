import {
  targetSize, sniffMediaType, dataUrlToBase64, downscaleImage, unreadableMessage, MAX_EDGE,
} from './downscaleImage';

describe('targetSize', () => {
  it('leaves small images alone', () => {
    expect(targetSize(800, 600)).toEqual({ width: 800, height: 600 });
  });
  it('scales the longest edge to MAX_EDGE and keeps the aspect ratio', () => {
    expect(targetSize(4032, 3024)).toEqual({ width: MAX_EDGE, height: 1176 });
    expect(targetSize(3024, 4032)).toEqual({ width: 1176, height: MAX_EDGE });
  });
  it('returns zero for unusable dimensions', () => {
    expect(targetSize(0, 100)).toEqual({ width: 0, height: 0 });
  });
});

describe('sniffMediaType', () => {
  it('reads the format from the base64 header', () => {
    expect(sniffMediaType('UklGRabc')).toBe('image/webp');
    expect(sniffMediaType('/9j/4AAQ')).toBe('image/jpeg');
    expect(sniffMediaType('iVBORw0K')).toBe('image/png');
    expect(sniffMediaType('AAAAHGZ0eXBoZWlj', 'image/heic')).toBe('image/heic');
  });
});

describe('dataUrlToBase64', () => {
  it('strips the data URL prefix', () => {
    expect(dataUrlToBase64('data:image/jpeg;base64,abc123')).toBe('abc123');
  });
});

describe('downscaleImage', () => {
  it('turns a decode failure into a user-facing HEIC hint', async () => {
    const file = { name: 'IMG_0001.HEIC', type: 'image/heic' };
    const decode = () => Promise.reject(new Error('unsupported'));
    await expect(downscaleImage(file, { decode })).rejects.toThrow(unreadableMessage(file));
  });
});
