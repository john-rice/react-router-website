import path from "path";
import fs from "fs";

import { https } from "follow-redirects";
import gunzip from "gunzip-maybe";
import tar, { Headers as TarHeaders } from "tar-stream";

const githubUrl = "https://github.com";

const agent = new https.Agent({
  keepAlive: true,
});

function get(options: Parameters<typeof https.get>["0"]) {
  return new Promise((accept, reject) => {
    https.get(options, accept).on("error", reject);
  });
}

function bufferStream(stream: NodeJS.ReadWriteStream): Promise<Buffer> {
  return new Promise((accept, reject) => {
    const chunks: any[] = [];

    stream
      .on("error", reject)
      .on("data", (chunk) => chunks.push(chunk))
      .on("end", () => accept(Buffer.concat(chunks)));
  });
}

/**
 * Returns a stream of the tarball'd contents of the given package.
 */
export async function getPackage(packageName: string, version: string) {
  const tarballURL = `${githubUrl}/${packageName}/archive${version}.tar.gz`;

  console.debug("Fetching package for %s from %s", packageName, tarballURL);

  const { hostname, pathname } = new URL(tarballURL);
  const options = {
    agent: agent,
    hostname: hostname,
    path: pathname,
  };

  const res: any = await get(options);

  if (res.statusCode === 200) {
    const stream = res.pipe(gunzip());
    // stream.pause();
    return stream;
  }

  if (res.statusCode === 404) {
    return null;
  }

  const content = (await bufferStream(res)).toString("utf-8");

  console.error(
    "Error fetching tarball for %s@%s (status: %s)",
    packageName,
    version,
    res.statusCode
  );

  console.error(content);

  return null;
}

export type Entry =
  | {
      path: string;
      type: TarHeaders["type"];
      content?: never;
    }
  | {
      type: "file";
      content: string;
      path: string;
    };

export async function findMatchingEntries(
  stream: NodeJS.ReadWriteStream,
  filename: string
): Promise<Entry[]> {
  // filename = /some/dir/name
  return new Promise((accept, reject) => {
    const entries: { [path: string]: Entry } = {};

    stream
      .pipe(tar.extract())
      .on("error", reject)
      .on("entry", async (header, stream, next) => {
        let entry: Entry = {
          // Most packages have header names that look like `package/index.js`
          // so we shorten that to just `/index.js` here. A few packages use a
          // prefix other than `package/`. e.g. the firebase package uses the
          // `firebase_npm/` prefix. So we just strip the first dir name.
          path: header.name.replace(/^[^/]+\/?/, "/"),
          type: header.type,
        };

        // Dynamically create "directory" entries for all subdirectories
        // in this entry's path. Some tarballs omit directory entries for
        // some reason, so this is the "brute force" method.
        let dir = path.dirname(entry.path);
        while (dir !== "/") {
          if (!entries[dir] && path.dirname(dir).startsWith(filename)) {
            entries[dir] = { path: dir, type: "directory" };
          }
          dir = path.dirname(dir);
        }

        // Ignore non-files and files that aren't in this directory.
        if (
          entry.type !== "file" ||
          !path.dirname(entry.path).startsWith(filename)
        ) {
          stream.resume();
          stream.on("end", next);
          return;
        }

        try {
          const content = await bufferStream(stream);

          entry = {
            type: "file",
            content: content.toString("utf-8"),
            path: entry.path,
          };

          let parsed = path.parse(entry.path);
          const slug = path.join(parsed.dir, parsed.name);
          entry.path = slug;
          entries[entry.path] = entry;

          next();
        } catch (error) {
          // @ts-ignore
          next(error);
        }
      })
      .on("finish", () =>
        accept(Object.values(entries).filter((entry) => entry.type === "file"))
      );
  });
}