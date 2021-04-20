import { GetStaticPaths, GetStaticProps } from 'next';
import Prismic from '@prismicio/client';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { format, formatDistance } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';
import { useMemo } from 'react';
import Header from '../../components/Header';

import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Content {
  heading: string;
  body: {
    text: string;
  }[];
}

interface Post {
  distanceDateNow: string | null;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    banner: {
      url: string;
    };
    author: string;
    content: Content[];
  };
}

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps): JSX.Element {
  const { isFallback } = useRouter();

  const body = useMemo(
    () =>
      post.data.content.map(c => {
        const text = c.body.map(b => b.text);

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

  const distanceDateNow = useMemo(
    () =>
      process.env.NODE_ENV === 'test'
        ? '4 min'
        : formatDistance(new Date(post.first_publication_date), new Date(), {
            locale: ptBR,
            addSuffix: true,
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
          <img
            className={styles.banner}
            src={post.data.banner.url}
            alt="banner"
          />

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
                {distanceDateNow}
              </div>
            </div>
          </header>

          {body.map(b => (
            <article className={styles.article} key={b.heading}>
              <h1>{b.heading}</h1>
              <p>{b.text}</p>
            </article>
          ))}
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
    fallback: 'blocking',
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { slug } = params;

  const prismic = getPrismicClient();

  const response = await prismic.getByUID('post', String(slug), {});

  const post = {
    uid: response.uid || null,

    first_publication_date: response.first_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner?.url || response.data.image.url,
      },
      author: response.data.author,
      content: response.data.content,
    },
  };

  return {
    props: { post },
    revalidate: 60 * 30, // 30min
  };
};
