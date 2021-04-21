/* eslint-disable react/no-danger */
import { GetStaticPaths, GetStaticProps } from 'next';
import Prismic from '@prismicio/client';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';
import { useEffect, useMemo } from 'react';
import { RichText } from 'prismic-dom';
import Link from 'next/link';
import Header from '../../components/Header';

import { getPrismicClient } from '../../services/prismic';

// import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Content {
  heading: string;
  body: {
    text: string;
  }[];
}

interface Post {
  last_publication_date: string | null;
  first_publication_date: string | null;
  next_page: {
    title: string | null;
    slug: string | null;
  };
  prev_page: {
    title: string | null;
    slug: string | null;
  };
  data: {
    title: string;
    subtitle: string;
    banner: {
      url: string | null;
    };
    author: string;
    content: Content[];
  };
}

interface PostProps {
  post: Post;
  preview: boolean;
}

export default function Post({ post, preview }: PostProps): JSX.Element {
  const { isFallback } = useRouter();

  useEffect(() => {
    const exists = document.getElementsByClassName('utterances').length;

    if (exists > 0) {
      return;
    }
    const script = document.createElement('script');
    const anchor = document.getElementById('inject-comments-for-uterances');
    script.setAttribute('src', 'https://utteranc.es/client.js');
    script.setAttribute('crossorigin', 'anonymous');
    script.setAttribute('async', 'async');
    script.setAttribute('repo', 'geninhocell/criando-um-projeto-do-zero');
    script.setAttribute('issue-term', 'pathname');
    script.setAttribute('theme', 'github-dark');
    if (!anchor) {
      return;
    }
    anchor.appendChild(script);
  }, []);

  const updatedAt = useMemo(() => {
    if (!post.last_publication_date) {
      return null;
    }
    return format(
      new Date(post.last_publication_date),
      "'* editado em 'dd' 'LLL' 'yyyy', às 'hh':'mm",
      {
        locale: ptBR,
      }
    );
  }, [post.last_publication_date]);

  const readingTime = useMemo(() => {
    const accTotal = post.data.content.reduce(
      (acc, content) => {
        acc.total += RichText.asText(content.body).split(' ').length / 200;
        return acc;
      },
      {
        total: 0,
      }
    );

    return Math.ceil(accTotal.total);
  }, [post.data.content]);

  const body = useMemo(
    () =>
      post.data.content.map(c => {
        const text = RichText.asHtml(c.body);

        return {
          heading: c.heading,
          text,
        };
      }),
    [post.data.content]
  );

  const dateFormatted = useMemo(
    () =>
      format(new Date(post.first_publication_date), "dd' 'LLL' 'yyyy", {
        locale: ptBR,
      }),
    [post.first_publication_date]
  );

  return (
    <>
      <Head>
        <title>Posts</title>
      </Head>
      <Header />
      {!isFallback ? (
        <div className={styles.container}>
          {post.data.banner.url && (
            <img
              className={styles.banner}
              src={post.data.banner.url}
              alt="banner"
            />
          )}

          <header className={styles.headerPost}>
            <h1>{post.data.title}</h1>
            <h2>{post.data.subtitle}</h2>
            <div className={styles.info}>
              <div>
                <FiCalendar />
                {dateFormatted}
              </div>
              <div>
                <FiUser />
                {post.data.author}
              </div>
              <div>
                <FiClock />
                {readingTime} min
              </div>
            </div>

            {updatedAt && <div className={styles.updatedAt}>{updatedAt}</div>}
          </header>

          {body.map(b => (
            <article className={styles.article} key={b.heading}>
              <h1>{b.heading}</h1>
              <div
                className={styles.postContent}
                dangerouslySetInnerHTML={{ __html: b.text }}
              />
            </article>
          ))}

          <div className={styles.divider} />

          <div className={styles.paginationNavigate}>
            {post.prev_page?.slug ? (
              <span className={styles.prev_page}>
                {post.prev_page?.title}{' '}
                <Link href={`/post/${post.prev_page.slug}`}>
                  <a>Post anterior</a>
                </Link>
              </span>
            ) : null}

            {post.next_page?.slug ? (
              <span className={styles.next_page}>
                {post.next_page.title}{' '}
                <Link href={`/post/${post.next_page.slug}`}>
                  <a>Próximo post</a>
                </Link>
              </span>
            ) : null}
          </div>
          <div id="inject-comments-for-uterances" className={styles.utteranc} />

          {preview && (
            <aside className={styles.preview}>
              <Link href="/api/exit-preview">
                <a>Sair do modo Preview</a>
              </Link>
            </aside>
          )}
        </div>
      ) : (
        <h1>Carregando...</h1>
      )}
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    [Prismic.Predicates.at('document.type', 'post')],
    {
      fetch: ['post.title', 'post.subtitle', 'post.author'],
      pageSize: 20,
    }
  );

  const postsUidValid = posts.results
    .filter(post => !!post.uid)
    .map(p => ({
      params: { slug: p.uid },
    }));

  // (paths): quais previews gerar durante a build
  //    vazio, todos os posts carregados durante os primeiros acessos
  // (fallback):
  //    true: Client Side, layout shift, ruim para CO
  //    false: Se o post não foi gerado, 404
  //    blocking: Server Side Rendering
  return {
    paths: postsUidValid,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps<PostProps> = async ({
  params,
  preview = false,
  previewData,
}) => {
  const { slug } = params;

  const prismic = getPrismicClient();

  const response = await prismic.getByUID('post', String(slug), {
    ref: previewData?.ref ?? null,
  });

  if (!response) {
    return {
      notFound: true,
    };
  }

  const after = await prismic.query(
    [
      Prismic.predicates.at('document.type', 'post'),
      Prismic.Predicates.dateAfter(
        'document.first_publication_date',
        response.first_publication_date
      ),
    ],
    {
      pageSize: 1,
    }
  );

  if (!after) {
    return {
      notFound: true,
    };
  }

  const before = await prismic.query(
    [
      Prismic.predicates.at('document.type', 'post'),
      Prismic.Predicates.dateBefore(
        'document.first_publication_date',
        response.first_publication_date
      ),
    ],
    {
      pageSize: 1,
    }
  );

  if (!before) {
    return {
      notFound: true,
    };
  }

  const post = {
    uid: response.uid || null,
    last_publication_date: response.last_publication_date,
    first_publication_date: response.first_publication_date,
    next_page: {
      title: after.results[0]?.data?.title || null,
      slug: after.results[0]?.uid || null,
    },
    prev_page: {
      title: before.results[0]?.data?.title || null,
      slug: before.results[0]?.uid || null,
    },
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner?.url || response.data.image?.url || null,
      },
      author: response.data.author,
      content: response.data.content,
    },
  };

  return {
    props: { post, preview },
    revalidate: 60 * 30, // 30min
  };
};
